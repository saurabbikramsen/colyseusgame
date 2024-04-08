import { Client, Room } from "colyseus.js";
import Phaser from "phaser";

export class GameScene extends Phaser.Scene {
  client = new Client("ws://localhost:2567");
  room: Room;
  counter: number = 1;

  playerDirection = new Map();
  mouseTouchDown = false;
  currentPlayer: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  remoteRef: Phaser.GameObjects.Rectangle;
  elapsedTime = 0;
  fixedTimeStep = 1000 / 60;
  bulletVelocity = 10;
  bulletEntities: { [sessionId: string]: any } = {};

  playerEntities: { [sessionId: string]: any } = {};

  inputPayload = {
    left: false,
    right: false,
    up: false,
    down: false,
    space: false,
  };
  cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
  preload() {
    this.playerDirection.set("direction", "up");
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.load.image("ship_0001", "rocket.png");
    this.load.image("sky", "sky.png");
    this.load.image("ground", "platform.png");
    this.load.image("star", "star.png");
    this.load.image("bomb", "bomb.png");
  }
  async create() {
    console.log("joining room... ");
    this.add.image(400, 300, "sky");
    let bounds = this.physics.add.staticGroup();

    bounds.create(400, 0, "ground").setScale(28, 1).refreshBody();
    bounds.create(400, 600, "ground").setScale(28, 1).refreshBody();
    bounds.create(0, 300, "ground").setScale(0.1, 20).refreshBody();
    bounds.create(800, 300, "ground").setScale(0.1, 20).refreshBody();
    try {
      this.room = await this.client.joinOrCreate("my_room");

      this.room.state.players.onAdd((player, sessionId) => {
        console.log("inside room state client");
        const entity = this.physics.add.image(player.x, player.y, "ship_0001");
        entity.setScale(0.1);
        this.playerEntities[sessionId] = entity;
        if (sessionId === this.room.sessionId) {
          this.currentPlayer = entity;

          this.remoteRef = this.add.rectangle(
            0,
            0,
            entity.width * 0.1,
            entity.height * 0.1,
          );
          this.remoteRef.setStrokeStyle(1, 0xff0000);

          player.onChange(() => {
            this.remoteRef.x = player.x;
            this.remoteRef.y = player.y;
          });
        } else {
          player.onChange(() => {
            entity.setData("serverX", player.x);
            entity.setData("serverY", player.y);
            entity.setData("serverDirn", player.direction);
          });
        }
      });
      this.room.state.bullets.onAdd((bullet, sessionId) => {
        console.log("room state bullet client", bullet.x, bullet.y);
        const bulletEntity = this.physics.add.image(bullet.x, bullet.y, "bomb");
        // this.fireBullet(bullet.x, bullet.y, bullet.direction, sessionId);
        this.bulletEntities[sessionId] = bulletEntity;
        console.log(sessionId);
        bullet.onChange(() => {
          bulletEntity.setData("serverX", bullet.x);
          bulletEntity.setData("serverY", bullet.y);
          bulletEntity.setData("serverDirn", bullet.direction);
        });
      });

      this.room.state.players.onRemove((player, sessionId) => {
        console.log("i am here");
        const entity = this.playerEntities[sessionId];
        if (entity) {
          entity.destroy();
          delete this.playerEntities[sessionId];
        }
      });
      this.room.state.bullets.onRemove((bullet, sessionId) => {
        console.log("inside delete");
        const entity = this.bulletEntities[sessionId];
        if (entity) {
          entity.destroy();
          delete this.bulletEntities[sessionId];
        }
      });

      this.input.keyboard.on("keydown-SPACE", () => {
        // this.fireBullet();
        this.room.send("shoot");
      });
      console.log("joined successfully!");
    } catch (e) {
      console.error(e);
    }
  }
  update(time: number, delta: number): void {
    if (!this.currentPlayer) {
      return;
    }
    this.elapsedTime += delta;
    while (this.elapsedTime >= this.fixedTimeStep) {
      this.elapsedTime -= this.fixedTimeStep;
      this.fixedTick(time, this.fixedTimeStep);
    }
  }
  fixedTick(time: number, fixedTimeStepValue: number) {
    const velocity = 2;
    this.inputPayload.left = this.cursorKeys.left.isDown;
    this.inputPayload.right = this.cursorKeys.right.isDown;
    this.inputPayload.up = this.cursorKeys.up.isDown;
    this.inputPayload.down = this.cursorKeys.down.isDown;
    this.room.send(0, this.inputPayload);

    if (this.inputPayload.left) {
      if (this.currentPlayer.x > 38) this.currentPlayer.x -= velocity;
      this.currentPlayer.angle = 270;
      this.playerDirection.set("direction", "left");
    } else if (this.inputPayload.right) {
      if (this.currentPlayer.x < 762.1) this.currentPlayer.x += velocity;
      this.currentPlayer.angle = 90;
      this.playerDirection.set("direction", "right");
    } else if (this.inputPayload.up) {
      if (this.currentPlayer.y > 34.13) this.currentPlayer.y -= velocity;
      this.currentPlayer.angle = 0;
      this.playerDirection.set("direction", "up");
    } else if (this.inputPayload.down) {
      if (this.currentPlayer.y < 562.137) this.currentPlayer.y += velocity;
      this.currentPlayer.angle = 180;
      this.playerDirection.set("direction", "down");
    }

    for (let sessionId in this.playerEntities) {
      if (sessionId === this.room.sessionId) {
        continue;
      }
      const entity = this.playerEntities[sessionId];
      const { serverX, serverY, serverDirn } = entity.data.values;

      entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
      entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);
      if (serverDirn === "left") {
        entity.angle = 270;
      } else if (serverDirn === "right") {
        entity.angle = 90;
      } else if (serverDirn === "up") {
        entity.angle = 0;
      } else if (serverDirn === "down") {
        entity.angle = 180;
      }
    }
    for (let sessionId in this.bulletEntities) {
      if (sessionId === this.room.sessionId) {
        continue;
      }
      const entity = this.bulletEntities[sessionId];
      const { serverX, serverY, serverDirn } = entity.data.values;
      entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
      entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);

      console.log(serverX, serverY);
      if (entity.x > 763 || entity.x < 37 || entity.y > 563 || entity.y < 33) {
        entity.destroy();
        delete this.bulletEntities[sessionId];
      }
      // if (serverDirn === "left") {
      // 	entity.x -= this.bulletVelocity;
      // } else if (serverDirn === "right") {
      // 	entity.x += this.bulletVelocity;
      // } else if (serverDirn === "up") {
      // 	entity.y -= this.bulletVelocity;
      // } else if (serverDirn === "down") {
      // 	entity.y += this.bulletVelocity;
      // }
    }
  }

  // fireBullet(x: any, y: any, direction: string, sessionId: string) {
  // 	const bullet = this.physics.add.image(x, y, "bomb");
  // 	this.bulletEntities[sessionId] = bullet;
  // 	if (bullet) {
  // 		if (bullet.x > 763 || bullet.x < 37 || bullet.y > 563 || bullet.y < 33)
  // 			this.resetBullet(bullet);
  // 		if (direction === "left") {
  // 			bullet.x = this.bulletVelocity;
  // 		} else if (direction === "right") {
  // 			bullet.x = this.bulletVelocity;
  // 		} else if (direction === "up") {
  // 			bullet.y = this.bulletVelocity;
  // 		} else if (direction === "down") {
  // 			bullet.y = this.bulletVelocity;
  // 		}
  // 	}
  // }
  resetBullet(bullet) {
    console.log("bullet destroyed");
    bullet.destroy();
  }
}
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#5b6d3c",
  parent: "phaser-example",
  physics: { default: "arcade" },
  pixelArt: true,
  scene: [GameScene],
};

const game = new Phaser.Game(config);

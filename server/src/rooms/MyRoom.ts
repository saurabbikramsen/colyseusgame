import { Room, Client } from "@colyseus/core";
import { Bullet, MyRoomState, Player } from "./schema/MyRoomState";

export class MyRoom extends Room<MyRoomState> {
  maxClients = 4;
  bulletCounter = 1;

  update(deltaTime: number) {
    const velocity = 2;

    this.state.players.forEach((player) => {
      let input: any;
      if (player?.inputQueue) {
        while ((input = player.inputQueue.shift())) {
          if (input.left) {
            if (player.x > 38) player.x -= velocity;
            player.direction = "left";
          } else if (input.right) {
            if (player.x < 762.1) player.x += velocity;
            player.direction = "right";
          } else if (input.up) {
            if (player.y > 34.13) player.y -= velocity;
            player.direction = "up";
          } else if (input.down) {
            if (player.y < 562.137) player.y += velocity;
            player.direction = "down";
          }
        }
      }
    });

    const bulletVelocity = 10;
    this.state.bullets.forEach((bullet, bulletId) => {
      if (bullet.x > 763 || bullet.x < 37 || bullet.y > 563 || bullet.y < 33) {
        this.removeBullet(bulletId);
      } else {
        if (bullet.direction === "left") {
          bullet.x -= bulletVelocity;
        } else if (bullet.direction === "right") {
          bullet.x += bulletVelocity;
        } else if (bullet.direction === "up") {
          bullet.y -= bulletVelocity;
        } else if (bullet.direction === "down") {
          bullet.y += bulletVelocity;
        }
      }
    });

    this.state.players.forEach((player, sessionId) => {
      this.state.bullets.forEach((bullet, bulletId) => {
        const bulletSessionId = bulletId.slice(0, 9);
        if (sessionId !== bulletSessionId) {
          if (
            player.x - 10 < bullet.x &&
            player.x + 10 > bullet.x &&
            player.y - 10 < bullet.y &&
            player.y + 10 > bullet.y
          ) {
            console.log("killed you motherfucker");
            this.removePlayer(sessionId);
            this.removeBullet(bulletSessionId);
          }
        }
      });
    });
  }

  onCreate(options: any) {
    this.setState(new MyRoomState());
    this.setSimulationInterval((deltaTime) => {
      this.update(deltaTime);
    });

    this.onMessage(0, (client, input) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.inputQueue.push(input);
      }
    });

    this.onMessage("shoot", (client) => {
      const player = this.state.players.get(client.sessionId);
      this.bulletCounter = this.bulletCounter + 1;
      const bullet = new Bullet();
      bullet.x = player.x;
      bullet.y = player.y;
      bullet.direction = player.direction;
      this.state.bullets.set(
        `${client.sessionId}${this.bulletCounter}`,
        bullet
      );
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    const mapWidth = 800;
    const mapHeight = 600;

    const player = new Player();
    player.x = Math.random() * mapWidth;
    player.y = Math.random() * mapHeight;
    player.direction = "up";

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  removeBullet(sessionId: string) {
    console.log("bullet destroyed");
    this.state.bullets.delete(sessionId);
  }
  removePlayer(sessionId: string) {
    console.log("player removed");
    this.state.players.delete(sessionId);
  }
  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
}

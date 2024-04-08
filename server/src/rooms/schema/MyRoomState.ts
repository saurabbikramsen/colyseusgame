import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("string") direction: string;
  inputQueue: any[] = [];
}
export class Bullet extends Schema {
  @type("number") x: number;
  @type("number") y: number;
  @type("string") direction: string;
}
export class MyRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Bullet }) bullets = new MapSchema<Bullet>();
}

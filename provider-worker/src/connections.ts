import { type JsonRpcEngine } from "json-rpc-engine";
import { nanoid } from "nanoid";

interface Connection {
  engine: JsonRpcEngine;
}

const connections: Map<[string, string], Connection> = new Map();
export const Connections = {
  add,
  remove,
  notifyAll,
};

function add(origin: string, conn: Connection) {
  const id = nanoid();
  connections.set([origin, id], conn);

  return id;
}

function remove(origin: string, id: string) {
  connections.delete([origin, id]);
}

function notifyAll(payload: unknown) {
  for (const { engine } of connections.values()) {
    if (engine) {
      engine.emit("notification", payload);
    }
  }
}

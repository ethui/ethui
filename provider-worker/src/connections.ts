const connections: Record<any, any> = {};

import { nanoid } from "nanoid";

export const Connections = {
  add,
  remove,
  notifyAll,
};

function add(origin: any, { engine }: any) {
  if (!connections[origin]) {
    connections[origin] = {};
  }
  const id = nanoid();
  connections[origin][id] = {
    engine,
  };

  return id;
}

function remove(origin: any, id: any) {
  if (!connections[origin]) {
    connections[origin] = {};
  }

  delete connections[origin][id];

  if (Object.keys(connections[origin].length === 0)) {
    delete connections[origin];
  }
}

function notifyAll(payload: any) {
  Object.keys(connections).forEach((origin) => {
    Object.values(connections[origin]).forEach(async (conn: any) => {
      if (conn.engine) {
        conn.engine.emit("notification", payload);
      }
    });
  });
}

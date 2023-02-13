interface RequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}

class Eip1193Provider {
  isConnected() {
    return true;
  }

  request(args: RequestArguments): Promise<unknown> {}
}

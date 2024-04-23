# @ethui/abiparse

A parser for translating raw input into usable Ethereum ABI parameters

## Features

- Parses strings of deeply nested arrays
- Understands the native ethereum types
- Output structure is compatible with `viem` ABI parameters

## Usage

Install the package...

```
yarn add @ethui/abiparser
```

...and use it:

```typescript
import { parse } from "@ethui/abiparser";

parse("-1");
// => -1

parse("[[1], 2]");
// => [[1n], 2n]

parse('[0x1234, "foo", [1, 2, 3]]');
// => ["0x1234", "foo", [1n, 2n, 3n]]
```

## TODO

- fixed-length arrays
- tuples / structs
- parse "1 ether", "1 gwei" into the corresponding numbers
- support ENS addresses somehow

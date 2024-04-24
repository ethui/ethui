import { createToken, Lexer as ChevrotainLexer, CstParser } from "chevrotain";

import { ethUnitRegex, parseIntWithUnit, type TEthUnit } from "./src/utils";

const int = createToken({ name: "int", pattern: /-?\d+/ });
const ethUnit = createToken({
  name: "ethUnit",
  pattern: ethUnitRegex,
});
const arrayOpen = createToken({ name: "arrayOpen", pattern: /\[/ });
const arrayClose = createToken({ name: "arrayClose", pattern: /\]/ });
const comma = createToken({ name: "comma", pattern: /,/ });
const hex = createToken({
  name: "hex",
  pattern: /0x([0-9a-fA-F][0-9a-fA-F])*/,
});
const quotedStr = createToken({
  name: "quotedStr",
  pattern: /"(?:[^"\\]|\\.)*"/,
});
const unquotedStr = createToken({
  name: "unquotedStr",
  pattern: /[^\[\]\",]+/,
});

const whitespace = createToken({
  name: "whitespace",
  pattern: /\s+/,
  group: ChevrotainLexer.SKIPPED,
});

// order matters here
// keep most common tokens first to improve performance,
// but otherwise keep in mind if two tokens are a possible match, priority is giving to first items here
// e.g. if unquotedStr is moved to the beginning, it would match things intended to be numbers, or just pure whitespaces
const tokens = [
  whitespace,
  comma,
  arrayOpen,
  arrayClose,
  hex,
  int,
  ethUnit,
  quotedStr,
  unquotedStr,
];

const Lexer = new ChevrotainLexer(tokens);

class Parser extends CstParser {
  constructor() {
    super(tokens);
    this.performSelfAnalysis();
  }

  public any = this.RULE("any", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.primitive) },
      { ALT: () => this.SUBRULE(this.composed) },
    ]);
  });

  private array = this.RULE("array", () => {
    this.CONSUME(arrayOpen);
    this.MANY_SEP({
      SEP: comma,
      DEF: () => {
        // TODO
        this.SUBRULE(this.any);
      },
    });
    this.CONSUME(arrayClose);
  });

  private number = this.RULE("number", () => {
    this.OR([
      { ALT: () => this.CONSUME(int) },
      { ALT: () => this.CONSUME(hex) },
    ]);
  });

  private numberWithSubunit = this.RULE("numberWithSubunit", () => {
    this.SUBRULE(this.number);
    this.CONSUME(ethUnit);
  });

  private composed = this.RULE("composed", () => {
    this.OR([{ ALT: () => this.SUBRULE(this.array) }]);
  });

  private primitive = this.RULE("primitive", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.numberWithSubunit) },
      { ALT: () => this.SUBRULE(this.number) },
      { ALT: () => this.CONSUME(quotedStr) },
      { ALT: () => this.CONSUME(unquotedStr) },
    ]);
  });
}

const parser = new Parser();

class Visitor extends parser.getBaseCstVisitorConstructorWithDefaults() {
  constructor() {
    super();
    this.validateVisitor();
  }

  any(ctx: any) {
    if (ctx.primitive) {
      return this.visit(ctx.primitive[0]);
    } else if (ctx.composed) {
      return this.visit(ctx.composed[0]);
    }
    return "error";
  }

  array(ctx: any) {
    return (ctx.any || []).map((v: any) => this.visit(v));
  }

  composed(ctx: any) {
    if (ctx.array) {
      return this.visit(ctx.array);
    } else {
      return "err";
    }
  }

  number(ctx: any) {
    if (ctx.int) {
      return BigInt(ctx.int[0].image);
    } else if (ctx.hex) {
      return ctx.hex[0].image;
    }
  }

  numberWithSubunit(ctx: any) {
    const n = BigInt(this.visit(ctx.number));
    const unit = ctx.ethUnit[0].image as TEthUnit;
    return parseIntWithUnit(n, unit);
  }

  primitive(ctx: any) {
    if (ctx.uint) {
      return BigInt(ctx.uint[0].image);
    } else if (ctx.int) {
      return BigInt(ctx.int[0].image);
    } else if (ctx.number) {
      return this.visit(ctx.number);
    } else if (ctx.numberWithSubunit) {
      return this.visit(ctx.numberWithSubunit);
    } else if (ctx.quotedStr) {
      return ctx.quotedStr[0].image.slice(1, -1).replace('\\"', '"');
    } else if (ctx.unquotedStr) {
      return ctx.unquotedStr[0].image;
    } else if (ctx.hex) {
      return ctx.hex[0].image;
    } else if (ctx.array) {
      return this.visit(ctx.array[0]);
    } else {
      return `unknown ${ctx}`;
    }
  }
}

const visitor = new Visitor();

export function parse(text: string) {
  if (!text || text.length === 0) return undefined;

  const lexResult = Lexer.tokenize(text);
  parser.input = lexResult.tokens;
  const cst = parser.any();

  if (parser.errors.length > 0) {
    return null;
    // throw Error("Parsing errors detected!\n" + parser.errors[0].message);
  }

  return visitor.visit(cst);
}

parse("[[123],2]");

// TODO visitor

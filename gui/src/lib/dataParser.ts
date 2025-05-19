import type {
  ErrorDescription,
  FunctionFragment,
  Interface,
  LogDescription,
  Result,
} from "ethers";

type ParsedInfo = {
  name: string;
  params: SolidityVariable[];
  returns: SolidityVariable[];
  error: null | ErrorDescription;
} | null;

type ConstructorInfo = {
  params: SolidityVariable[];
} | null;

type TraceLog = {
  raw_log: {
    topics: ReadonlyArray<string>;
    data: string;
  };
};

type SolidityVariable = {
  vartype: string;
  varname: string;
  varvalue: string;
};

export const splitConstructorFromArguments = (
  hexString: string,
): { contractData: string; constructorArgs: string } => {
  const regex = /0008[0-9a-f]{2}0033/gi;
  let match: RegExpExecArray | null;
  let lastMatchIndex = -1;

  match = regex.exec(hexString);
  while (match !== null) {
    lastMatchIndex = match.index + match[0].length;
    match = regex.exec(hexString);
  }

  if (lastMatchIndex !== -1) {
    return {
      contractData: hexString.substring(0, lastMatchIndex),
      constructorArgs: hexString.substring(lastMatchIndex),
    };
  }

  return {
    contractData: hexString,
    constructorArgs: "",
  };
};

export const parseConstructorData = (
  iface: Interface,
  constructorArgs: string,
): ConstructorInfo => {
  try {
    const decodedData: Result = iface._decodeParams(
      iface.deploy.inputs,
      `0x${constructorArgs}`,
    );

    const params: SolidityVariable[] = [];

    iface.deploy.inputs.forEach((input, index) => {
      const value = decodedData[index];

      params.push({
        varname: input.name,
        vartype: input.type,
        varvalue: value.toString(),
      });
    });

    return { params };
  } catch (error) {
    console.error("Error parsing constructor data:", error);
    return null;
  }
};

export const parseFunctionData = (
  iface: Interface,
  functionSelector: string,
  data: string,
  output: string,
  success: boolean,
): ParsedInfo => {
  let functionFragment: FunctionFragment | null = null;
  try {
    functionFragment = iface.getFunction(functionSelector);
    if (!functionFragment) return null;

    const decodedData: Result = iface.decodeFunctionData(
      functionFragment,
      data,
    );

    const name = functionFragment.name;

    const params: SolidityVariable[] = [];
    const returns: SolidityVariable[] = [];
    let error: null | ErrorDescription = null;

    functionFragment.inputs.forEach((input, index) => {
      const value = decodedData[index];

      params.push({
        varname: input.name,
        vartype: input.type,
        varvalue: value.toString(),
      });
    });

    if (success) {
      const decodedOutput: Result = iface.decodeFunctionResult(
        functionFragment,
        output,
      );

      functionFragment.outputs.forEach((output, index) => {
        const value = decodedOutput[index];

        returns.push({
          varname: output.name,
          vartype: output.type,
          varvalue: value.toString(),
        });
      });
    } else {
      error = iface.parseError(output);
    }

    return {
      name,
      params,
      returns,
      error,
    };
  } catch (error) {
    console.error("Error parsing trace data:", error);
    console.log(
      functionSelector,
      success,
      data,
      output,
      functionFragment?.name,
    );
    return null;
  }
};

export const parseLog = (iface: Interface, log: TraceLog): ParsedInfo => {
  try {
    const parsedLog: LogDescription | null = iface.parseLog(log.raw_log);
    const params: SolidityVariable[] = [];
    const returns: SolidityVariable[] = [];
    const error = null;

    if (!parsedLog) {
      return null;
    }

    parsedLog.fragment.inputs.forEach((input, index) => {
      const value = parsedLog.args[index];

      params.push({
        varname: input.name,
        vartype: input.type,
        varvalue: value.toString(),
      });
    });

    return {
      name: parsedLog.name,
      error,
      returns,
      params,
    };
  } catch (error) {
    console.log("Error parsing log:", error);
    return null;
  }
};

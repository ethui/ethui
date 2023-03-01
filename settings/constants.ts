export const provider = {
  // The name of the stream consumed by {@link IronInpageProvider}.
  // TODO: need to change this "iron:provider" later, but currenly not sure if
  // this is used implicitly in some of metamask's dependencies
  streamName: "metamask-provider",
  contentscriptStreamName: "iron:provider:contentscript",
  inpageStreamName: "iron:provider:inpage",
};

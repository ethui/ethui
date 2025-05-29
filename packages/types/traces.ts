import { z } from "zod";

// Define the runtime validation schema using zod
const LogEntrySchema = z.object({
  address: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format")
    .optional(),
  topics: z.array(z.string().regex(/^0x[a-fA-F0-9]*$/, "Invalid topic format")),
  data: z.string().regex(/^0x[a-fA-F0-9]*$/, "Invalid data format"),
});

const TraceNodeSchema = z.object({
  parent: z.number().nullable(),
  children: z.array(z.number()),
  idx: z.number(),
  trace: z.object({
    depth: z.number(),
    success: z.boolean(),
    caller: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid caller address format"),
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format"),
    maybe_precompile: z.union([z.boolean(), z.null()]), // This allows either boolean or null
    selfdestruct_address: z.null(),
    selfdestruct_refund_target: z.null(),
    selfdestruct_transferred_value: z.null(),
    kind: z.enum(["CREATE", "CREATE2", "STATICCALL", "DELEGATECALL", "CALL"]),
    value: z.string().regex(/^0x[a-fA-F0-9]*$/, "Invalid value format"),
    data: z.string().regex(/^0x[a-fA-F0-9]*$/, "Invalid data format"),
    output: z.string().regex(/^0x[a-fA-F0-9]*$/, "Invalid output format"),
    gas_used: z.number(),
    gas_limit: z.number(),
    status: z.enum(["Return", "Stop", "Revert", "OutOfGas"]),
    steps: z.array(z.unknown()),
    decoded: z.object({
      label: z.null(),
      return_data: z.null(),
      call_data: z.null(),
    }),
  }),
  logs: z.array(
    z.object({
      raw_log: LogEntrySchema,
      decoded: z.object({
        name: z.string().nullable(),
        params: z.string().nullable(),
      }),
      position: z.number(),
    }),
  ),
  ordering: z.array(
    z.union([z.object({ Call: z.number() }), z.object({ Log: z.number() })]),
  ),
});

const TestKindSchema = z.object({
  Unit: z
    .object({
      gas: z.number(),
    })
    .optional(),
  Fuzz: z
    .object({
      first_case: z.object({
        calldata: z.string(),
      }),
    })
    .optional(),
});

const DurationSchema = z.object({
  secs: z.number(),
  nanos: z.number(),
});

const TestResultSchema = z.object({
  status: z.enum(["Failure", "Success", "Skipped"]),
  reason: z.string().nullable().optional(),
  counterexample: z.union([z.object({}).passthrough(), z.null()]).optional(),
  logs: z.array(LogEntrySchema),
  traces: z.array(
    z.tuple([
      z.enum(["Deployment", "Setup", "Execution"]),
      z.object({ arena: z.array(TraceNodeSchema) }),
    ]),
  ),
  kind: TestKindSchema,
  duration: DurationSchema,
  labeled_addresses: z.record(
    z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address format"),
    z.string(),
  ),
});

const TestFileResultSchema = z.object({
  duration: z.string(),
  test_results: z.record(z.string(), TestResultSchema),
});

const ForgeTestTraceSchema = z.record(z.string(), TestFileResultSchema);

export type ForgeTestTraceType = z.infer<typeof ForgeTestTraceSchema>;

export default ForgeTestTraceSchema;

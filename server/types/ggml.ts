import { z } from "zod";

export const GGML_WEIGHTS_TYPE = [
  "bf16",
  "f16",
  "f32",
  "f64",
  "i16",
  "i32",
  "i64",
  "i8",
  "iq1_m",
  "iq1_s",
  "iq2_s",
  "iq2_xs",
  "iq2_xxs",
  "iq3_s",
  "iq3_xxs",
  "iq4_nl",
  "iq4_xs",
  "mxfp4",
  "q2_K",
  "q3_K",
  "q4_0",
  "q4_1",
  "q4_K",
  "q5_0",
  "q5_1",
  "q5_K",
  "q6_K",
  "q8_0",
  "q8_K",
  "tq1_0",
  "tq2_0",
] as const;

export const quantizationSchema = z.enum(GGML_WEIGHTS_TYPE);
export type Quantization = z.infer<typeof quantizationSchema>;

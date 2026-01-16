/*
Copyright 2025 The Loopstack Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { BlockConfig, Tool, ToolResult, WithArguments } from "@loopstack/common";
import { ToolBase, WorkflowExecution } from "@loopstack/core";
import { SandboxCommand } from "@loopstack/sandbox-tool";
import { Injectable } from "@nestjs/common";
import { z } from "zod";

const propertiesSchema = z
  .object({
    containerId: z
      .string()
      .describe("The ID of the container to read the file from"),
    path: z.string().describe("The path to the file to read"),
    encoding: z
      .enum(["utf8", "base64"])
      .default("utf8")
      .describe("The encoding to use when reading the file"),
  })
  .strict();

type SandboxReadFileArgs = z.infer<typeof propertiesSchema>;

interface SandboxReadFileResult {
  content: string;
  encoding: string;
}

@Injectable()
@BlockConfig({
  config: {
    description: "Read file contents from a sandbox container",
  },
})
@WithArguments(propertiesSchema)
export class SandboxReadFile extends ToolBase<SandboxReadFileArgs> {
  @Tool() private sandboxCommand: SandboxCommand;

  async execute(
    args: SandboxReadFileArgs,
    ctx: WorkflowExecution,
  ): Promise<ToolResult<SandboxReadFileResult>> {
    const { containerId, path, encoding } = args;

    const executable = encoding === "base64" ? "base64" : "cat";
    const result = await this.sandboxCommand.execute(
      {
        containerId,
        executable,
        args: [path],
        timeout: 30000,
      },
    );

    if (result.data.exitCode !== 0) {
      throw new Error(
        `Failed to read file ${path}: ${result.data.stderr || "Unknown error"}`,
      );
    }

    return {
      data: {
        content: result.data.stdout,
        encoding,
      },
    };
  }
}

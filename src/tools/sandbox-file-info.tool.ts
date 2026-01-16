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
      .describe("The ID of the container to get file info from"),
    path: z.string().describe("The path to the file or directory"),
  })
  .strict();

type SandboxFileInfoArgs = z.infer<typeof propertiesSchema>;

interface SandboxFileInfoResult {
  path: string;
  name: string;
  type: "file" | "directory" | "symlink" | "other";
  size: number;
  permissions: string;
  owner: string;
  group: string;
  modifiedAt: string;
  accessedAt: string;
  createdAt: string;
}

@Injectable()
@BlockConfig({
  config: {
    description: "Get detailed information about a file or directory in a sandbox container",
  },
})
@WithArguments(propertiesSchema)
export class SandboxFileInfo extends ToolBase<SandboxFileInfoArgs> {
  @Tool() private sandboxCommand: SandboxCommand;

  async execute(
    args: SandboxFileInfoArgs,
    ctx: WorkflowExecution,
  ): Promise<ToolResult<SandboxFileInfoResult>> {
    const { containerId, path: targetPath } = args;

    // Use stat to get detailed file information
    // Format: type|size|permissions|owner|group|mtime|atime|ctime
    const result = await this.sandboxCommand.execute(
      {
        containerId,
        executable: "stat",
        args: ["-c", "%F|%s|%A|%U|%G|%y|%x|%w", targetPath],
        timeout: 10000,
      },
    );

    if (result.data.exitCode !== 0) {
      throw new Error(
        `Failed to get file info for ${targetPath}: ${result.data.stderr || "Unknown error"}`,
      );
    }

    const output = result.data.stdout.trim();
    const parts = output.split("|");

    if (parts.length < 8) {
      throw new Error(`Unexpected stat output format: ${output}`);
    }

    const [typeStr, sizeStr, permissions, owner, group, mtime, atime, ctime] =
      parts;

    const name = targetPath.split("/").pop() || targetPath;

    return {
      data: {
        path: targetPath,
        name,
        type: this.parseFileType(typeStr),
        size: parseInt(sizeStr, 10),
        permissions,
        owner,
        group,
        modifiedAt: mtime,
        accessedAt: atime,
        createdAt: ctime === "-" ? mtime : ctime,
      },
    };
  }

  private parseFileType(typeStr: string): SandboxFileInfoResult["type"] {
    const lower = typeStr.toLowerCase();
    if (lower.includes("regular")) return "file";
    if (lower.includes("directory")) return "directory";
    if (lower.includes("symbolic link")) return "symlink";
    return "other";
  }
}

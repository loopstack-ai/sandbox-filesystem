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
      .describe("The ID of the container to list the directory from"),
    path: z.string().describe("The path to the directory to list"),
    recursive: z
      .boolean()
      .default(false)
      .describe("Whether to list directories recursively"),
  })
  .strict();

type SandboxListDirectoryArgs = z.infer<typeof propertiesSchema>;

interface FileEntry {
  name: string;
  type: "file" | "directory" | "symlink" | "other";
  size: number;
  path: string;
}

interface SandboxListDirectoryResult {
  path: string;
  entries: FileEntry[];
}

@Injectable()
@BlockConfig({
  config: {
    description: "List files and directories in a sandbox container",
  },
})
@WithArguments(propertiesSchema)
export class SandboxListDirectory extends ToolBase<SandboxListDirectoryArgs> {
  @Tool() private sandboxCommand: SandboxCommand;

  async execute(
    args: SandboxListDirectoryArgs,
    ctx: WorkflowExecution,
  ): Promise<ToolResult<SandboxListDirectoryResult>> {
    const { containerId, path: dirPath, recursive } = args;

    // Use find for recursive, ls for non-recursive
    // Output format: type size path
    const command = recursive
      ? `find '${dirPath.replace(/'/g, "'\\''")}' -printf '%y %s %p\\n'`
      : `find '${dirPath.replace(/'/g, "'\\''")}' -maxdepth 1 -printf '%y %s %p\\n'`;

    const result = await this.sandboxCommand.execute(
      {
        containerId,
        executable: "sh",
        args: ["-c", command],
        timeout: 30000,
      },
    );

    if (result.data.exitCode !== 0) {
      throw new Error(
        `Failed to list directory ${dirPath}: ${result.data.stderr || "Unknown error"}`,
      );
    }

    const entries: FileEntry[] = [];
    const lines = result.data.stdout.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      const match = line.match(/^(\S)\s+(\d+)\s+(.+)$/);
      if (match) {
        const [, typeChar, sizeStr, fullPath] = match;
        const name = fullPath.split("/").pop() || fullPath;

        // Skip the directory itself in non-recursive mode
        if (fullPath === dirPath) continue;

        entries.push({
          name,
          type: this.parseFileType(typeChar),
          size: parseInt(sizeStr, 10),
          path: fullPath,
        });
      }
    }

    return {
      data: {
        path: dirPath,
        entries,
      },
    };
  }

  private parseFileType(typeChar: string): FileEntry["type"] {
    switch (typeChar) {
      case "f":
        return "file";
      case "d":
        return "directory";
      case "l":
        return "symlink";
      default:
        return "other";
    }
  }
}

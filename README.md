# @loopstack/sandbox-filesystem

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

This module provides secure, controlled filesystem operations within Docker sandbox environments for Loopstack workflows.

## Overview

The Sandbox Filesystem module enables workflows to perform file and directory operations in isolated Docker containers. It provides a comprehensive set of tools for reading, writing, listing, and managing files within sandbox environments, ensuring secure execution of filesystem operations.

By using this module, you'll be able to:

- Create, read, update, and delete files within sandbox containers
- List directory contents with recursive options
- Create directories with automatic parent directory creation
- Get detailed file and directory metadata
- Check for file/directory existence
- Handle both text and binary file content using UTF-8 or base64 encoding
- Perform all operations within the security boundary of Docker containers

This module is essential for workflows that need to manipulate files in isolated environments, such as code execution sandboxes, build environments, or secure file processing pipelines.

**Note:** This module requires `@loopstack/sandbox-tool` as a dependency. The Docker sandbox containers must be initialized using `SandboxInit` and destroyed using `SandboxDestroy` from the `@loopstack/sandbox-tool` module. The filesystem tools operate on containers that have been created by the sandbox-tool.

## Installation

### Prerequisites

Create a new Loopstack project if you haven't already:

```bash
npx create-loopstack-app my-project
cd my-project
```

Start Environment

```bash
cd my-project
docker compose up -d
```

### Install the Module

#### As Node Dependency via Npm:

```bash
npm install --save @loopstack/sandbox-filesystem
```

#### OR: Copy Sources via Loopstack CLI

```bash
loopstack add @loopstack/sandbox-filesystem
```

> `loopstack add` copies the source files into your `src` directory. This is a great way to explore the code to learn new concepts or add own customizations.

## Setup

### 1. Import the Module

Add `SandboxFilesystemModule` to your `default.module.ts` (included in the skeleton app) or to your own module:

```typescript
import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { SandboxFilesystemModule } from '@loopstack/sandbox-filesystem';
import { DefaultWorkspace } from './default.workspace';

@Module({
  imports: [LoopCoreModule, CoreUiModule, SandboxFilesystemModule],
  providers: [DefaultWorkspace],
})
export class DefaultModule {}
```

### 2. Use in Your Workflow

Inject the tools in your workflow class using the @Tool() decorator:

```typescript
import { Injectable } from '@nestjs/common';
import { BlockConfig, Tool, WithState } from '@loopstack/common';
import { WorkflowBase } from '@loopstack/core';
import {
  SandboxWriteFile,
  SandboxReadFile,
  SandboxListDirectory,
  SandboxCreateDirectory,
  SandboxDelete,
  SandboxExists,
  SandboxFileInfo,
} from '@loopstack/sandbox-filesystem';
import { SandboxInit, SandboxDestroy } from '@loopstack/sandbox-tool';
import { z } from 'zod';

@Injectable()
@BlockConfig({
  configFile: __dirname + '/my.workflow.yaml',
})
@WithState(z.object({
  containerId: z.string().optional(),
  fileContent: z.string().optional(),
  fileList: z.array(z.any()).optional(),
}))
export class MyWorkflow extends WorkflowBase {
  
  // Sandbox lifecycle tools (from @loopstack/sandbox-tool)
  @Tool() sandboxInit: SandboxInit;
  @Tool() sandboxDestroy: SandboxDestroy;
  
  // Filesystem tools (from @loopstack/sandbox-filesystem)
  @Tool() sandboxWriteFile: SandboxWriteFile;
  @Tool() sandboxReadFile: SandboxReadFile;
  @Tool() sandboxListDirectory: SandboxListDirectory;
  @Tool() sandboxCreateDirectory: SandboxCreateDirectory;
  @Tool() sandboxDelete: SandboxDelete;
  @Tool() sandboxExists: SandboxExists;
  @Tool() sandboxFileInfo: SandboxFileInfo;
  
}
```

And use them in your YAML workflow configuration:

```yaml
# src/my.workflow.yaml
transitions:
  # Initialize the sandbox container (required before filesystem operations)
  - id: init_sandbox
    from: start
    to: sandbox_ready
    call:
      - tool: sandboxInit
        args:
          containerId: my-sandbox
          imageName: node:18
          containerName: my-filesystem-sandbox
          projectOutPath: /tmp/workspace
          rootPath: workspace
        assign:
          containerId: ${ result.data.containerId }

  # Create a directory
  - id: create_dir
    from: sandbox_ready
    to: dir_created
    call:
      - tool: sandboxCreateDirectory
        args:
          containerId: ${ containerId }
          path: /workspace/output
          recursive: true

  # Write a file
  - id: write_file
    from: dir_created
    to: file_written
    call:
      - tool: sandboxWriteFile
        args:
          containerId: ${ containerId }
          path: /workspace/output/result.txt
          content: "Hello from sandbox!"
          encoding: utf8
          createParentDirs: true

  # Read the file
  - id: read_file
    from: file_written
    to: file_read
    call:
      - tool: sandboxReadFile
        args:
          containerId: ${ containerId }
          path: /workspace/output/result.txt
          encoding: utf8
        assign:
          fileContent: ${ result.data.content }

  # List directory contents
  - id: list_dir
    from: file_read
    to: dir_listed
    call:
      - tool: sandboxListDirectory
        args:
          containerId: ${ containerId }
          path: /workspace/output
          recursive: false
        assign:
          fileList: ${ result.data.entries }

  # Check file existence
  - id: check_exists
    from: dir_listed
    to: existence_checked
    call:
      - tool: sandboxExists
        args:
          containerId: ${ containerId }
          path: /workspace/output/result.txt

  # Get file info
  - id: get_info
    from: existence_checked
    to: info_retrieved
    call:
      - tool: sandboxFileInfo
        args:
          containerId: ${ containerId }
          path: /workspace/output/result.txt

  # Delete the file
  - id: delete_file
    from: info_retrieved
    to: file_deleted
    call:
      - tool: sandboxDelete
        args:
          containerId: ${ containerId }
          path: /workspace/output/result.txt
          force: true

  # Destroy the sandbox container (cleanup)
  - id: destroy_sandbox
    from: file_deleted
    to: end
    call:
      - tool: sandboxDestroy
        args:
          containerId: ${ containerId }
          removeContainer: true
```

## About

Author: Tobias Blättermann, Jakob Klippel

License: Apache-2.0

### Additional Resources:

- [Loopstack Documentation](https://loopstack.ai)
- [Getting Started with Loopstack](https://loopstack.ai)
- For more examples how to use this tool look for `@loopstack/sandbox-filesystem` in the [Loopstack Registry](https://loopstack.ai/registry)

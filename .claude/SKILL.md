---
name: sandbox-filesystem-tool
description: Build a secure filesystem operations tool for Docker sandbox environments using the Loopstack framework
---

# Sandbox Filesystem Tool Implementation Guide

## Overview

You are building `@loopstack/sandbox-filesystem`, a Loopstack tool that provides secure, controlled filesystem operations within Docker sandbox environments. This tool enables workflows to read, write, list, and manage files and directories in isolated containers.

## What to Build

Create a NestJS injectable tool class that extends `ToolBase` and provides filesystem operations executed within sandbox containers using `@loopstack/sandbox-tool`.

### Core Operations Required

1. **Read File** - Read complete file contents from a specified path
2. **Write File** - Write content to a file, creating parent directories if needed
3. **List Directory** - List files and subdirectories with metadata
4. **Create Directory** - Create directories with recursive parent creation
5. **Delete File/Directory** - Remove files or directories
6. **Check Existence** - Verify if a file or directory exists
7. **Get File Info** - Retrieve metadata (size, type, timestamps)

## Tool Arguments Schema

Define a Zod schema with the following structure:

```typescript
const sandboxFilesystemSchema = z.object({
  operation: z.enum(['read', 'write', 'list', 'createDir', 'delete', 'exists', 'info']),
  path: z.string().describe('Target filesystem path within sandbox'),
  content: z.string().optional().describe('Content to write (for write operation)'),
  encoding: z.string().default('utf-8').optional().describe('Character encoding'),
  recursive: z.boolean().default(false).optional().describe('Enable recursive operations'),
  force: z.boolean().default(false).optional().describe('Force overwrite or deletion'),
});

type SandboxFilesystemArgs = z.infer<typeof sandboxFilesystemSchema>;
```

## Implementation Structure

```typescript
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ToolBase } from '@loopstack/core';
import { BlockConfig, ToolResult, WithArguments } from '@loopstack/common';

@Injectable()
@BlockConfig({
  config: {
    description: 'Secure filesystem operations within Docker sandbox environments',
  },
})
@WithArguments(sandboxFilesystemSchema)
export class SandboxFilesystemTool extends ToolBase<SandboxFilesystemArgs> {
  
  async execute(args: SandboxFilesystemArgs): Promise<ToolResult<any>> {
    // 1. Validate path for security (no ../ traversal)
    // 2. Normalize path
    // 3. Execute operation based on args.operation
    // 4. Return structured result with success, data, metadata
  }
}
```

## Tool Result Structure

Return a `ToolResult` with this structure:

```typescript
{
  data: {
    success: boolean,
    data: any,              // Operation-specific payload
    error?: string,         // Error message if failed
    metadata?: {            // Additional context
      bytesWritten?: number,
      itemsCount?: number,
      // etc.
    }
  }
}
```

## Security Requirements

### Path Validation
- **CRITICAL**: Block path traversal attacks by rejecting paths containing `../`
- Normalize all paths before execution
- Restrict access to sandbox-designated directories only
- Never allow access to system directories like `/etc`, `/sys`, `/proc`

### Resource Limits
- Enforce `maxFileSize` configuration (suggest default: 10MB)
- Implement operation timeouts (suggest default: 5000ms)
- Limit recursive depth to prevent infinite loops (suggest max: 10 levels)

### Error Handling
- Sanitize error messages to prevent information leakage
- Provide generic errors to users, detailed logs internally
- Fail safely on permission errors

## Configuration Options

Support these configuration properties in the tool:

```typescript
interface SandboxFilesystemConfig {
  defaultEncoding?: string;      // Default: 'utf-8'
  maxFileSize?: number;          // Default: 10485760 (10MB)
  allowedPaths?: string[];       // Whitelist of accessible paths
  timeoutMs?: number;            // Default: 5000
}
```

## Usage Examples

### Example 1: Read a Configuration File

```yaml
transitions:
  - id: read_config
    from: start
    to: process
    call:
      - tool: sandboxFilesystem
        args:
          operation: 'read'
          path: '/workspace/config.json'
          encoding: 'utf-8'
        assign:
          configData: ${ result.data.data }
```

### Example 2: Write Generated Code

```yaml
transitions:
  - id: save_output
    from: generate
    to: end
    call:
      - tool: sandboxFilesystem
        args:
          operation: 'write'
          path: '/workspace/output/generated.ts'
          content: ${ generatedCode }
          recursive: true
        assign:
          writeResult: ${ result.data }
```

### Example 3: List Directory Contents

```yaml
transitions:
  - id: list_files
    from: start
    to: process
    call:
      - tool: sandboxFilesystem
        args:
          operation: 'list'
          path: '/workspace/data'
          recursive: false
        assign:
          fileList: ${ result.data.data }
```

### Example 4: Check File Existence Before Processing

```yaml
transitions:
  - id: check_and_process
    from: start
    to: process
    call:
      - tool: sandboxFilesystem
        args:
          operation: 'exists'
          path: '/workspace/input.txt'
        assign:
          fileExists: ${ result.data.data }
```

## Dependencies

Ensure these packages are installed:

```json
{
  "dependencies": {
    "@loopstack/sandbox-tool": "latest",
    "@loopstack/core": "latest",
    "@loopstack/common": "latest",
    "@nestjs/common": "^10.0.0",
    "zod": "^3.22.0"
  }
}
```

## Module Registration

Register the tool in your NestJS module:

```typescript
import { Module } from '@nestjs/common';
import { SandboxFilesystemTool } from './sandbox-filesystem.tool';

@Module({
  providers: [SandboxFilesystemTool],
  exports: [SandboxFilesystemTool],
})
export class SandboxFilesystemModule {}
```

## Troubleshooting

### "Path traversal detected" Error
- Ensure paths don't contain `../` sequences
- Use absolute paths starting with `/workspace/` or configured allowed paths
- Normalize paths before validation

### "File size exceeds maximum" Error
- Check `maxFileSize` configuration
- For large files, consider streaming or chunked operations
- Increase limit if appropriate for your use case

### "Operation timeout" Error
- Verify sandbox container is running and accessible
- Check network connectivity to Docker environment
- Increase `timeoutMs` configuration for slow filesystems

### Permission Denied Errors
- Verify Docker volume mounts are configured correctly
- Ensure sandbox container has appropriate user permissions
- Check that target paths are within allowed sandbox boundaries

### Binary vs Text File Handling
- Use appropriate encoding: `'utf-8'` for text, `'binary'` or `'base64'` for binary files
- Specify encoding explicitly in arguments to avoid corruption
- Consider file type when reading/writing

## Best Practices

1. **Always validate paths** before executing operations
2. **Use recursive: true** only when necessary to avoid performance issues
3. **Set appropriate timeouts** based on expected file sizes
4. **Handle errors gracefully** in workflows with fallback transitions
5. **Log operations** for audit trails and debugging
6. **Test in sandbox** before production deployment
7. **Limit file sizes** to prevent resource exhaustion
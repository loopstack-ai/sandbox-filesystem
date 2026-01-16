# Software Requirements Document: sandbox-filesystem

## 1. Overview

### 1.1 Purpose
The `sandbox-filesystem` tool provides secure, controlled filesystem operations within Docker sandbox environments. It enables workflows to read, write, list, and manage files and directories in isolated containers through a standardized interface using the `@loopstack/sandbox-tool` package.

### 1.2 Goals
- Enable safe filesystem operations in sandboxed environments
- Provide a consistent API for common file and directory operations
- Prevent unauthorized access outside designated sandbox boundaries
- Support both synchronous and asynchronous file operations
- Facilitate file-based data exchange between workflow steps

### 1.3 Target Users
- Workflow developers requiring file manipulation in isolated environments
- AI agents needing to read/write files during automated processes
- Automation engineers building file processing pipelines
- Developers creating workflows that generate or consume file-based artifacts

### 1.4 Use Cases
- Reading configuration files or input data in sandbox environments
- Writing generated code, reports, or processed data to sandbox storage
- Listing directory contents for file discovery and validation
- Creating directory structures for organized output
- Verifying file existence before processing
- Deleting temporary files after workflow completion

## 2. General Information

**Tool Name:** `@loopstack/sandbox-filesystem`

**Maintainer:** loopstack-ai (GitHub Organization)

**License:** Apache-2.0

**Author:** Jakob Klippel

## 3. Functional Requirements

### 3.1 Core Functionality

The tool shall provide the following filesystem operations:

#### 3.1.1 Read File
- Read complete file contents from a specified path
- Support text and binary file formats
- Return file content as string or buffer

#### 3.1.2 Write File
- Write content to a specified file path
- Create parent directories if they don't exist
- Support text and binary data
- Allow overwriting existing files

#### 3.1.3 List Directory
- List all files and subdirectories in a specified path
- Return file metadata (name, type, size)
- Support recursive directory traversal option

#### 3.1.4 Create Directory
- Create a new directory at specified path
- Support recursive creation of parent directories
- Handle existing directory gracefully

#### 3.1.5 Delete File/Directory
- Remove files from specified path
- Remove directories (empty or with recursive option)
- Provide confirmation of deletion

#### 3.1.6 Check Existence
- Verify if a file or directory exists at given path
- Return boolean result

#### 3.1.7 Get File Info
- Retrieve metadata about a file or directory
- Include size, type, creation/modification timestamps

### 3.2 Input Specifications

Each operation shall accept the following parameters as applicable:

- **path** (required): Target filesystem path within sandbox
- **content** (for write operations): Data to write to file
- **encoding** (optional): Character encoding (default: utf-8)
- **recursive** (optional): Enable recursive operations
- **force** (optional): Force overwrite or deletion

### 3.3 Output Specifications

Operations shall return structured results containing:

- **success**: Boolean indicating operation success
- **data**: Operation-specific payload (file content, directory listing, file info)
- **error**: Error message if operation failed
- **metadata**: Additional context (bytes written, items counted, etc.)

### 3.4 Configuration Options

The tool shall support the following configuration:

- **defaultEncoding**: Default character encoding for text operations
- **maxFileSize**: Maximum file size for read/write operations
- **allowedPaths**: Whitelist of accessible paths within sandbox
- **timeoutMs**: Maximum execution time for operations

## 4. Technical Requirements

### 4.1 Integration with Loopstack

#### 4.1.1 Tool Base Implementation
- Extend `ToolBase` class with appropriate type parameters
- Implement `execute()` method for each filesystem operation
- Use `@Injectable()`, `@BlockConfig()`, and `@WithArguments()` decorators

#### 4.1.2 Argument Validation
- Define Zod schemas for each operation's arguments
- Enforce path format validation
- Validate file size limits
- Ensure encoding values are supported

#### 4.1.3 Result Format
- Return `ToolResult` structure with typed data
- Include operation-specific metadata
- Provide actionable error messages

### 4.2 Dependencies

#### 4.2.1 Required Packages
- `@loopstack/sandbox-tool`: Core sandbox execution functionality
- `@loopstack/core`: Base tool classes and interfaces
- `@loopstack/common`: Shared decorators and types
- `@nestjs/common`: Dependency injection framework
- `zod`: Schema validation

#### 4.2.2 Peer Dependencies
- Compatible Node.js version with filesystem promises API
- Docker environment with appropriate volume mounts

### 4.3 Security Considerations

#### 4.3.1 Path Validation
- Prevent path traversal attacks (../ sequences)
- Restrict access to sandbox-designated directories only
- Normalize paths before execution
- Block access to system directories

#### 4.3.2 Resource Limits
- Enforce maximum file size restrictions
- Implement operation timeouts
- Limit recursive depth for directory operations
- Prevent disk space exhaustion

#### 4.3.3 Sandbox Isolation
- Execute all operations within Docker container context
- Utilize `@loopstack/sandbox-tool` security mechanisms
- Ensure operations cannot escape sandbox boundaries
- Validate sandbox environment before execution

#### 4.3.4 Error Handling
- Sanitize error messages to prevent information leakage
- Log security-relevant events
- Fail safely on permission errors
- Provide generic error messages to end users

### 4.4 Performance Requirements

- File read operations complete within 5 seconds for files up to 10MB
- Directory listings return within 3 seconds for directories with up to 1000 items
- Write operations complete within 5 seconds for files up to 10MB
- All operations respect configured timeout limits

### 4.5 Reliability Requirements

- Handle filesystem permission errors gracefully
- Recover from temporary filesystem unavailability
- Validate sandbox environment availability before operations
- Provide clear error messages for all failure scenarios
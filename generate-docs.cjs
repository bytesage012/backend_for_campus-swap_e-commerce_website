const fs = require('fs');
const path = require('path');

const NGROK_URL = 'https://retrorsely-ugly-stephaine.ngrok-free.dev/api';
const spec = JSON.parse(fs.readFileSync('ecommerce-backend-spec.json', 'utf8'));

// Helper to generate example JSON from schema
function generateExample(schema, schemas, depth = 0) {
    if (depth > 3) return {}; // Prevent infinite recursion
    if (!schema) return {};

    if (schema.$ref) {
        const refName = schema.$ref.split('/').pop();
        return generateExample(schemas[refName], schemas, depth + 1);
    }

    if (schema.type === 'object') {
        const example = {};
        if (schema.properties) {
            for (const [key, prop] of Object.entries(schema.properties)) {
                example[key] = generateExampleValue(prop, schemas, depth + 1);
            }
        }
        return example;
    }

    if (schema.type === 'array') {
        return [generateExample(schema.items, schemas, depth + 1)];
    }

    return generateExampleValue(schema, schemas, depth);
}

function generateExampleValue(prop, schemas, depth = 0) {
    if (depth > 3) return null;

    if (prop.$ref) {
        const refName = prop.$ref.split('/').pop();
        return generateExample(schemas[refName], schemas, depth + 1);
    }

    if (prop.enum) return prop.enum[0];
    if (prop.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
    if (prop.format === 'email') return 'user@unn.edu.ng';
    if (prop.format === 'date-time') return '2026-01-04T00:00:00.000Z';
    if (prop.format === 'uri') return 'https://example.com/image.jpg';
    if (prop.format === 'binary') return null; // File upload
    if (prop.type === 'string') return prop.example || 'example string';
    if (prop.type === 'number') return prop.example || (prop.minimum || 100);
    if (prop.type === 'integer') return prop.example || (prop.minimum || 1);
    if (prop.type === 'boolean') return true;
    if (prop.type === 'array') return [generateExampleValue(prop.items, schemas, depth + 1)];
    if (prop.type === 'object') return generateExample(prop, schemas, depth + 1);

    return null;
}

// Helper to format field type
function formatFieldType(prop) {
    if (prop.$ref) return `object (${prop.$ref.split('/').pop()})`;
    if (prop.enum) return `enum (${prop.enum.join('|')})`;
    if (prop.format === 'binary') return 'file (image)';
    if (prop.format) return `${prop.type} (${prop.format})`;
    if (prop.type === 'array') return `array of ${formatFieldType(prop.items)}`;
    return prop.type || 'any';
}

// Generate context-specific error messages
function getErrorMessage(pathStr, method) {
    if (pathStr.includes('login')) return 'Invalid credentials';
    if (pathStr.includes('register')) return 'User already exists or validation failed';
    if (pathStr.includes('upload')) return 'File upload failed or invalid file type';
    if (method === 'GET' && pathStr.includes('{id}')) return 'Resource not found';
    if (method === 'POST') return 'Invalid input data or missing required fields';
    if (method === 'PATCH' || method === 'PUT') return 'Update failed or unauthorized';
    if (method === 'DELETE') return 'Deletion failed or unauthorized';
    return 'An error occurred';
}

// Group endpoints by tag
const endpointsByTag = {};

for (const [pathStr, pathObj] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(pathObj)) {
        if (method === 'parameters') continue;

        const tags = operation.tags || ['Uncategorized'];
        tags.forEach(tag => {
            if (!endpointsByTag[tag]) endpointsByTag[tag] = [];
            endpointsByTag[tag].push({
                path: pathStr,
                method: method.toUpperCase(),
                operation
            });
        });
    }
}

// Generate markdown for each tag
const outputDir = path.join(__dirname, 'ai-studio-batches');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

for (const [tag, endpoints] of Object.entries(endpointsByTag)) {
    let markdown = `# ${tag} API Documentation\n\n`;
    markdown += `This document contains all endpoints related to ${tag}.\n\n`;
    markdown += `---\n\n`;

    for (const { path: pathStr, method, operation } of endpoints) {
        const summary = operation.summary || 'No summary';
        const requiresAuth = operation.security && operation.security.length > 0;

        markdown += `## ${pathStr} - ${method}\n`;
        markdown += `Summary: ${summary}\n\n`;

        // Determine content type
        let contentType = 'application/json';
        let isMultipart = false;
        if (operation.requestBody?.content) {
            const contentTypes = Object.keys(operation.requestBody.content);
            contentType = contentTypes[0];
            isMultipart = contentType.includes('multipart');
        }

        // Build cURL command
        let curlCmd = `curl -X '${method}' '${NGROK_URL}${pathStr}'`;

        // Add headers
        curlCmd += ` \\\n  -H 'accept: */*'`;
        curlCmd += ` \\\n  -H 'ngrok-skip-browser-warning: true'`;

        if (!isMultipart && contentType.includes('json')) {
            curlCmd += ` \\\n  -H 'Content-Type: application/json'`;
        }

        if (requiresAuth) {
            curlCmd += ` \\\n  -H 'Authorization: Bearer <TOKEN>'`;
        }

        // Add request body
        let requestExample = null;
        const inputs = [];

        if (operation.requestBody?.content) {
            const content = operation.requestBody.content[contentType];
            if (content?.schema) {
                requestExample = generateExample(content.schema, spec.components.schemas);

                if (isMultipart) {
                    // For multipart, show form fields
                    const props = content.schema.properties || {};
                    for (const [key, prop] of Object.entries(props)) {
                        const required = content.schema.required?.includes(key) ? ' (required)' : '';
                        inputs.push(`- ${key}: ${formatFieldType(prop)}${required}`);

                        if (prop.format === 'binary') {
                            curlCmd += ` \\\n  -F '${key}=@/path/to/file.jpg'`;
                        } else if (prop.type === 'array' && prop.items?.format === 'binary') {
                            curlCmd += ` \\\n  -F '${key}=@/path/to/file1.jpg'`;
                            curlCmd += ` \\\n  -F '${key}=@/path/to/file2.jpg'`;
                        } else {
                            const exampleValue = generateExampleValue(prop, spec.components.schemas);
                            curlCmd += ` \\\n  -F '${key}=${exampleValue}'`;
                        }
                    }
                } else if (contentType.includes('json') && Object.keys(requestExample).length > 0) {
                    curlCmd += ` \\\n  -d '${JSON.stringify(requestExample, null, 2)}'`;
                }

                // Collect input fields for documentation
                if (content.schema.properties && !isMultipart) {
                    for (const [key, prop] of Object.entries(content.schema.properties)) {
                        const required = content.schema.required?.includes(key) ? ' (required)' : '';
                        inputs.push(`- ${key}: ${formatFieldType(prop)}${required}`);
                    }
                }
            }
        }

        // From parameters
        if (operation.parameters) {
            for (const param of operation.parameters) {
                const required = param.required ? ' (required)' : '';
                const location = param.in;
                inputs.push(`- ${param.name} (${location}): ${formatFieldType(param.schema)}${required}`);
            }
        }

        markdown += `**CURL REQUEST**\n\`\`\`bash\n${curlCmd}\n\`\`\`\n\n`;

        // Input fields
        markdown += `**INPUT LISTS AND TYPE**\n`;
        if (inputs.length > 0) {
            markdown += inputs.join('\n') + '\n\n';
        } else {
            markdown += 'No input required\n\n';
        }

        // Add special notes for multipart endpoints
        if (isMultipart) {
            markdown += `**IMPORTANT**: `;
            const fieldNames = Object.keys(operation.requestBody.content[contentType].schema.properties || {});
            if (fieldNames.length > 0) {
                markdown += `Field names must be exactly: \`${fieldNames.join('`, `')}\`. Using different names will result in "MulterError: Unexpected field".\n\n`;
            }
        }

        // Expected outputs
        markdown += `**EXPECTED OUTPUT BOTH ERROR AND SUCCESS MESSAGES**\n\n`;

        // Success responses
        const successCodes = Object.keys(operation.responses || {}).filter(c => c.startsWith('2'));
        for (const code of successCodes) {
            const response = operation.responses[code];
            markdown += `**Success (Status ${code})**\n`;
            if (response.description) markdown += `${response.description}\n\n`;

            if (response.content?.['application/json']?.schema) {
                const example = generateExample(response.content['application/json'].schema, spec.components.schemas);
                markdown += `\`\`\`json\n${JSON.stringify(example, null, 2)}\n\`\`\`\n\n`;
            } else {
                markdown += `\`\`\`json\n{ "message": "Success" }\n\`\`\`\n\n`;
            }
        }

        // Error responses
        const errorCodes = Object.keys(operation.responses || {}).filter(c => !c.startsWith('2') && c !== 'default');
        if (errorCodes.length > 0) {
            markdown += `**Error (Status ${errorCodes.join('/')})**\n\n`;
            const errorMsg = getErrorMessage(pathStr, method);
            markdown += `\`\`\`json\n{ "message": "${errorMsg}" }\n\`\`\`\n\n`;
        }

        // Add MulterError for multipart endpoints
        if (isMultipart) {
            markdown += `**Error (Status 500 - Wrong field name)**\n\n`;
            markdown += `\`\`\`json\n{ "message": "MulterError: Unexpected field" }\n\`\`\`\n\n`;
        }

        markdown += `---\n\n`;
    }

    const filename = path.join(outputDir, `${tag}.md`);
    fs.writeFileSync(filename, markdown);
    console.log(`✓ Generated ${tag}.md`);
}

console.log(`\n✅ Documentation generated for ${Object.keys(endpointsByTag).length} modules`);

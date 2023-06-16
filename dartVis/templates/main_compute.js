const BUFFER_SIZE = 1000;

const shader = `
    @group(0) @binding(0)
    var<storage, read_write> output: array<f32>;

    @compute @workgroup_size(64)
    fn main(
        @builtin(global_invocation_id) global_id: vec3u,
        @builtin(local_invocation_id) local_id: vec3u
    ) {
        // avoid accessing the buffer out of bounds
        if (global_id.x >= ${BUFFER_SIZE}) {
            return;
        }

        output[global_id.x] = f32(global_id.x) * 1000. + f32(local_id.x);
    }
`;

async function init() {
    // Request GPU adapter and device
    if (!navigator.gpu) {
        throw Error('WebGPU not supported');
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw Error('Couldn\'t request WebGPU adapter');
    }

    const device = await adapter.requestDevice();

    // Create a shader module from the shader template literal
    const shaderModule = device.createShaderModule({
        code: shader
    });

    // Create output and staging buffers in the GPU
    const output = device.createBuffer({
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    const stagingBuffer = device.createBuffer({
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    })

    // Define the bindings of the storage with the compute pipeline
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'storage'
                }
            }
        ]
    });

    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: output
                }
            }
        ]
    });

    // Set up compute pipeline and pass encoder
    const computePipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        }),
        compute: {
            module: shaderModule,
            entryPoint: 'main'
        }
    });

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();

    // Run a compute pass
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(BUFFER_SIZE/64));

    passEncoder.end();

    // Submit the command to the GPU queue
    commandEncoder.copyBufferToBuffer(
        output,
        0,  // src offset
        stagingBuffer,
        0, // dst offset
        BUFFER_SIZE
    );

    device.queue.submit([commandEncoder.finish()]);

    await stagingBuffer.mapAsync(
        GPUMapMode.READ,
        0,  // offset
        BUFFER_SIZE // length
    );

    const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE);
    const data = copyArrayBuffer.slice();
    stagingBuffer.unmap();

    // const p = document.getElementById('text');
    // const textNode = document.createTextNode(JSON.stringify(data));
    // p.appendChild(textNode);

    console.log(new Float32Array(data));
}

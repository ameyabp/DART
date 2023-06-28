import {fetchMapData} from './baseMap.js';
import {vec3, mat4} from 'https://wgpu-matrix.org/dist/2.x/wgpu-matrix.module.js';

// Clear color for GPURenderPassDescriptor
const clearColor = { r: 0.0, g: 0.0, b: 0.0, a: 1.0 };

// Vertex data for triangle
// Each vertex has 8 values representing position and color: X Y Z W R G B A

const vertices = new Float32Array([
  0.0,  0.6, 0, 1, 1, 1, 1, 1,
 -0.5, -0.6, 0, 1, 1, 1, 1, 1,
  0.5, -0.6, 0, 1, 1, 1, 1, 1,
  0.0,  0.6, 0, 1, 1, 1, 1, 1,
]);

// Vertex and fragment shaders

const shaders = `
struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

@vertex
fn vertex_main(@location(0) position: vec4f,
               @location(1) color: vec4f) -> VertexOut
{
  var output : VertexOut;
  output.position = position;
  output.color = color;
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  return fragData.color;
}
`;

const usMapShaders = `
@binding(0) @group(0) var<uniform> normalizedDeviceCoordinateSpaceTransformationMatrix: mat4x4<f32>;

struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

@vertex
fn vertex_main(@location(0) position: vec4f,
               @location(1) color: vec4f) -> VertexOut
{
  var output : VertexOut;
  // matrix multiplications are performed in the reverse order in wgsl
  // so a * b will actually perform b * a
  output.position = normalizedDeviceCoordinateSpaceTransformationMatrix * position;
  output.color = color;
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f
{
  return fragData.color;
}
`;

// Main function

async function init() {
  // fetch USMap Data
  var usMapData = await fetchMapData();//getUSMapData();
  console.log(usMapData);
  const arcID = 127;

  // set up stats monitor panel
  var stats = new Stats();
  document.querySelector("#stats-div").appendChild( stats.domElement );
   
  function animate() {
      // stats.begin();
      // monitored code goes here i.e.
      // per frame processing code
      // stats.end();
      stats.update();
   
      requestAnimationFrame( animate );
  }
   
  requestAnimationFrame( animate );

  // 1: request adapter and device
  if (!navigator.gpu) {
    throw Error('WebGPU not supported.');
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw Error('Couldn\'t request WebGPU adapter.');
  }

  let device = await adapter.requestDevice();

  // 2: Create a shader module from the shaders template literal
  const shaderModule = device.createShaderModule({
    code: usMapShaders
  });

  // 3: Get reference to the canvas to render on
  const canvas = document.querySelector('#gpuCanvas');
  const context = canvas.getContext('webgpu');

  context.configure({
    device: device,
    format: navigator.gpu.getPreferredCanvasFormat(),
    alphaMode: 'premultiplied'
  });

  // 4: Create vertex buffer to contain vertex data
  const vertexBuffer = device.createBuffer({
    // size: vertices.byteLength, // make it big enough to store vertices in
    size: usMapData.arcData[arcID].points.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });

  // Copy the vertex data over to the GPUBuffer using the writeBuffer() utility function
  // device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);
  device.queue.writeBuffer(vertexBuffer, 0, usMapData.arcData[arcID].points, 0, usMapData.arcData[arcID].points.length);

  // 5: Create a GPUVertexBufferLayout and GPURenderPipelineDescriptor to provide a definition of our render pipline
  const vertexBuffers = [{
    attributes: [{
      shaderLocation: 0, // position
      offset: 0,
      format: 'float32x4'
    }, {
      shaderLocation: 1, // color
      offset: 16,
      format: 'float32x4'
    }],
    arrayStride: 32,
    stepMode: 'vertex'
  }];

  const pipelineDescriptor = {
    vertex: {
      module: shaderModule,
      entryPoint: 'vertex_main',
      buffers: vertexBuffers
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fragment_main',
      targets: [{
        format: navigator.gpu.getPreferredCanvasFormat()
      }]
    },
    primitive: {
      topology: 'line-strip'
    },
    layout: 'auto'
  };

  // 6: Create the actual render pipeline

  const renderPipeline = device.createRenderPipeline(pipelineDescriptor);
  
  // create transformation matrix
  // matrix multiplications are performed in the reverse order in wgpu-matrix library
  // mat4.multiply(a,b) will perform b*a
  const ndcsTransformMatrix = mat4.multiply(mat4.scaling([2/(usMapData.maxX - usMapData.minX), 2/(usMapData.maxY - usMapData.minY), 1]), mat4.translation([-usMapData.meanX, -usMapData.meanY, 0]));

  // Create buffer to hold matrix for transforming vertices to normalizedDeviceCoordinateSpace (ndcs)
  const ndcsTransformMatrixBuffer = device.createBuffer({
    size: ndcsTransformMatrix.byteLength, // 4x4 matrix of float32
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const ndcsTransformBindGrouop = device.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: ndcsTransformMatrixBuffer
        }
      }
    ]
  });

  // write transformation matrix to gpu buffer
  // console.log(ndcsTransformMatrix)
  device.queue.writeBuffer(ndcsTransformMatrixBuffer, 0, ndcsTransformMatrix.buffer, ndcsTransformMatrix.byteOffset, ndcsTransformMatrix.byteLength);

  // 7: Create GPUCommandEncoder to issue commands to the GPU
  // Note: render pass descriptor, command encoder, etc. are destroyed after use, fresh one needed for each frame.
  const commandEncoder = device.createCommandEncoder();

  // 8: Create GPURenderPassDescriptor to tell WebGPU which texture to draw into, then initiate render pass

  const renderPassDescriptor = {
    colorAttachments: [{
      clearValue: clearColor,
      loadOp: 'clear',
      storeOp: 'store',
      view: context.getCurrentTexture().createView()
    }]
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    
  // 9: Draw the triangle

  passEncoder.setPipeline(renderPipeline);
  passEncoder.setBindGroup(0, ndcsTransformBindGrouop);
  passEncoder.setVertexBuffer(0, vertexBuffer);
  passEncoder.draw(usMapData.arcData[arcID].numPoints);

  // End the render pass
  passEncoder.end();

  // 10: End frame by passing array of command buffers to command queue for execution
  device.queue.submit([commandEncoder.finish()]);
}

init();
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

async function getUSMapData() {
  var usMapData = {
    'points': [],
    'numPoints': 0,
    'minX': 180,
    'maxX': -180,
    'meanX': 0,
    'minY': 90,
    'maxY': -90,
    'meanY': 0
  };
  // var points = [];
  // var meanX = 0, meanY = 0;
  // var maxX = -180, minX = 180;
  // var minY = 180, maxY = -180;

  // await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/nation-10m.json')
  await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json')
    .then(function(data) {
      console.log(data);
      data.arcs.map(function(arc) {
        var x=0, y=0;
        arc.map(function(point2d) {
          var point3d = []
          point3d.push((x += point2d[0]) * data.transform.scale[0] + data.transform.translate[0]);
          point3d.push((y += point2d[1]) * data.transform.scale[1] + data.transform.translate[1]);
          point3d.push(0);  // z coordinate
          point3d.push(1);  // w cordinate for matrix operations

          // white color
          point3d.push(1);
          point3d.push(1);
          point3d.push(1);
          point3d.push(1);
          
          usMapData.meanX += point3d[0];
          usMapData.minX = Math.min(usMapData.minX, point3d[0]);
          usMapData.maxX = Math.max(usMapData.maxX, point3d[0]);
          
          usMapData.meanY += point3d[1];
          usMapData.minY = Math.min(usMapData.minY, point3d[1]);
          usMapData.maxY = Math.max(usMapData.maxY, point3d[1]);
          
          usMapData.numPoints++;

          usMapData.points = usMapData.points.concat(point3d);
        })
      })
    });

  usMapData.meanX = usMapData.meanX/usMapData.numPoints;
  usMapData.meanY = usMapData.meanY/usMapData.numPoints;
  // console.log(usMapData);

  for (let i=0; i<usMapData.numPoints; i++) {
      // x coordinate
      usMapData.points[8*i] = (usMapData.points[8*i] - usMapData.meanX)/(usMapData.maxX - usMapData.minX)
      // y coordinate
      usMapData.points[8*i+1] = (usMapData.points[8*i+1] - usMapData.meanY)/(usMapData.maxY - usMapData.minY)
  }
  
  usMapData.points = new Float32Array(usMapData.points)
  return usMapData;
}

const usMapShaders = `
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

// Main function

async function init() {
  // fetch USMap Data
  var usMapData = await getUSMapData();
  console.log(usMapData);

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
    size: usMapData.points.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  // Copy the vertex data over to the GPUBuffer using the writeBuffer() utility function
  // device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);
  device.queue.writeBuffer(vertexBuffer, 0, usMapData.points, 0, usMapData.points.length);

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
  passEncoder.setVertexBuffer(0, vertexBuffer);
  passEncoder.draw(usMapData.numPoints);

  // End the render pass
  passEncoder.end();

  // 10: End frame by passing array of command buffers to command queue for execution
  device.queue.submit([commandEncoder.finish()]);
}

"use strict";

var vertexShaderSource = `#version 300 es
precision highp float;

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer

in vec4 a_position;
out vec2 v_positionWithOffset;
uniform float u_tileSize;
uniform vec3 u_tileCoords;

// all shaders have a main function
void main() {

  // gl_Position is a special variable a vertex shader
  // is responsible for setting
  gl_Position = a_position;

  float zoomFactor = pow(2.0, u_tileCoords.z);
  float xSize = u_tileSize / zoomFactor;  
  float ySize = u_tileSize / zoomFactor;  

  vec4 scaledBoundary = vec4(
    ( u_tileCoords.x * xSize),
    ((u_tileCoords.x + 1.0) * xSize),
    ((u_tileCoords.y + 1.0) * ySize),
    ( u_tileCoords.y * ySize)
  );

  // Map from (-1,1) position to the complex plane we're drawing 
  float x = ((a_position.x+1.0)/2.0) * (scaledBoundary.y - scaledBoundary.x) + scaledBoundary.x;
  float y = ((a_position.y+1.0)/2.0) * (scaledBoundary.w - scaledBoundary.z) + scaledBoundary.z;
  v_positionWithOffset = vec2(x, y);
}
`;

var fragmentShaderSource = `#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

uniform int u_iter;
uniform sampler2D u_texture;

uniform vec2 u_juliaCoords;
uniform bool u_useJuliaCoords;

in vec2 v_positionWithOffset;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  // Just set the output to a constant redish-purple
  vec2 z = v_positionWithOffset;
  vec2 c;
  if (u_useJuliaCoords) {
    c = u_juliaCoords;
  } else {
    c = v_positionWithOffset;
  }
  // vec2 c = vec2();

  int i;
  for(i=0; i<u_iter; i++) {
      float x = (z.x * z.x - z.y * z.y) + c.x;
      float y = (z.y * z.x + z.x * z.y) + c.y;

      if((x * x + y * y) > 4.0) break;
      z.x = x;
      z.y = y;
  }
  outColor = i == u_iter ? vec4(0,0,0,1) : texture(u_texture, vec2(float(i) / float(u_iter))); 
}
`;

function setupFullscreenQuad(gl, program) {
  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const positions = [
    -1, -1,
    -1, 1,
    1, 1,
    1, 1,
    1, -1,
    -1, -1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.vertexAttribPointer(
    positionAttributeLocation,
    2,         // 2 components per iteration
    gl.FLOAT,  // Data is 32bit float
    false,     // Already a float, normalization has no effect
    0,         // Stride is 0 (no space between data) 
    0          // Offset is 0 (always start from the beginning)
  );
}

function setupUniforms(gl, program, coords, maxIterations, useJuliaCoords, juliaRe, juliaIm) {
  const iterLoc = gl.getUniformLocation(program, "u_iter");
  gl.uniform1i (iterLoc, maxIterations);

  const tileSizeLoc = gl.getUniformLocation(program, "u_tileSize");
  gl.uniform1f(tileSizeLoc, 2);
  
  const tileCoordsLoc = gl.getUniformLocation(program, "u_tileCoords");
  gl.uniform3f(tileCoordsLoc, coords.x, coords.y, coords.z);

  const useJuliaCoordsLoc = gl.getUniformLocation(program, "u_useJuliaCoords");
  gl.uniform1i(useJuliaCoordsLoc, useJuliaCoords);
  
  const juliaCoordsLoc = gl.getUniformLocation(program, "u_juliaCoords");
  gl.uniform2f(juliaCoordsLoc, juliaRe, juliaIm);
}

function setupTexture(gl, program) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
 
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array(colorGradient.generateColorArray()));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  const textureLocation = gl.getUniformLocation(program, "u_texture");
  gl.uniform1i(textureLocation, 0);
}

function drawTile(canvas, coords, colorGradient, maxIterations, useJuliaCoords, juliaRe, juliaIm) {
  var gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  const program = initProgram(gl, vertexShaderSource, fragmentShaderSource);
  gl.useProgram(program);

  setupFullscreenQuad(gl, program);
  setupUniforms(gl, program, coords, maxIterations, useJuliaCoords, juliaRe, juliaIm);
  setupTexture(gl, program, colorGradient);

  // draw
  var primitiveType = gl.TRIANGLES;
  var offset = 0;
  var count = 6;
  gl.drawArrays(primitiveType, offset, count);
}

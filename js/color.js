"use strict";

class Color {
  constructor(r, g, b) {
    this.r = parseInt(r, 10);
    this.g = parseInt(g, 10);
    this.b = parseInt(b, 10);
  }

  static fromHex(hex) {
    var bigint = parseInt(hex.split('#').pop(), 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;
    return new Color(r, g, b);
  }

  stepTo(otherColor, ratio) {
    return new Color(
      Math.floor(this.r + ((otherColor.r - this.r) * ratio)),
      Math.floor(this.g + ((otherColor.g - this.g) * ratio)),
      Math.floor(this.b + ((otherColor.b - this.b) * ratio))
    );
  }

  toString() {
    return `rgb(${this.r}, ${this.g}, ${this.b})`;
  }

  toArray() {
    return [this.r, this.g, this.b, 255];
  }
}

class ColorGradient {
  constructor(colors, textureCanvas) {
    this.textureCanvas = textureCanvas;
    this.updateColors(colors);
  }

  updateColors(colors) {
    this.colors = colors;
    this.interpolate();
    this.updateTextureCanvas();
  }

  interpolate() {
    this.interpolatedColors = [];
    const totalSteps = 256;
    let colors = [...this.colors];
    let positions = [];
    for (let i = 0; i < colors.length; i++) {
      positions.push(i / (colors.length - 1));
    }
    let currentColor = colors.shift();
    let currentPosition = positions.shift();
    let nextColor = colors.shift();
    let nextPosition = positions.shift();
    let ratioIncrement = 1 / (totalSteps * (nextPosition - currentPosition));
    let currentStep = 0;

    for (let i = 0; i < totalSteps; i++) {
      if (i / totalSteps >= nextPosition) {
        currentColor = nextColor
        currentPosition = nextPosition;
        nextColor = colors.shift();
        nextPosition = positions.shift();        
        ratioIncrement = 1 / (totalSteps * (nextPosition - currentPosition));
        currentStep = 0;
      }
      let color = currentColor.stepTo(nextColor, currentStep * ratioIncrement);
      this.interpolatedColors.push(color);
      currentStep++;
    }
  }

  generateColorArray() {
    const colorArray = [];
    for (let i = 0; i < 256; i++) {
      var color = this.interpolatedColors[i];
      colorArray.push(...color.toArray());
    }
    return colorArray;
  }

  updateTextureCanvas() {
    const context = this.textureCanvas.getContext('2d');
    for (let i = 0; i < 256; i++) {
      var color = this.interpolatedColors[i];
      context.strokeStyle = color.toString();
      context.strokeRect(0, i, 20, 1);
    }
  }
}

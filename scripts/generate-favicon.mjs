#!/usr/bin/env node
import fs from 'fs';
import { createCanvas } from 'canvas';

const size = 128;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Background - red circle
ctx.fillStyle = '#DC2626';
ctx.beginPath();
ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
ctx.fill();

// Santa hat - main body (red)
ctx.fillStyle = '#DC2626';
ctx.strokeStyle = '#991B1B';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(35, 75);
ctx.quadraticCurveTo(40, 35, 64, 25);
ctx.quadraticCurveTo(88, 35, 93, 75);
ctx.fill();
ctx.stroke();

// Santa hat - white trim
ctx.fillStyle = 'white';
ctx.beginPath();
ctx.ellipse(64, 75, 32, 8, 0, 0, Math.PI * 2);
ctx.fill();

// Santa hat - pom-pom
ctx.fillStyle = 'white';
ctx.beginPath();
ctx.arc(64, 22, 10, 0, Math.PI * 2);
ctx.fill();

// Gift box - main body (green)
ctx.fillStyle = '#16A34A';
const giftX = 48;
const giftY = 78;
const giftW = 32;
const giftH = 28;
ctx.beginPath();
ctx.roundRect(giftX, giftY, giftW, giftH, 2);
ctx.fill();

// Gift ribbon - vertical (red)
ctx.fillStyle = '#DC2626';
ctx.fillRect(62, 78, 4, 28);

// Gift ribbon - horizontal (red)
ctx.fillRect(48, 90, 32, 4);

// Gift bow - center circle
ctx.fillStyle = '#DC2626';
ctx.beginPath();
ctx.arc(64, 78, 6, 0, Math.PI * 2);
ctx.fill();

// Gift bow - left loop
ctx.beginPath();
ctx.ellipse(58, 75, 6, 4, 0, 0, Math.PI * 2);
ctx.fill();

// Gift bow - right loop
ctx.beginPath();
ctx.ellipse(70, 75, 6, 4, 0, 0, Math.PI * 2);
ctx.fill();

// Save PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('./public/favicon.png', buffer);

console.log('✓ Favicon PNG generated successfully!');

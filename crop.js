const sharp = require('sharp');

sharp('public/logo.png')
  .trim()
  .toFile('public/logo_cropped.png')
  .then(info => {
    console.log("Successfully cropped transparent pixels!", info);
  })
  .catch(err => {
    console.error("Error cropping image:", err);
  });

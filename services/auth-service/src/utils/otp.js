const bcrypt = require('bcrypt');

exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.hashOTP = async (code) => {
  return await bcrypt.hash(code, 10);
};

exports.compareOTP = async (input, hashed) => {
  return await bcrypt.compare(input, hashed);
};
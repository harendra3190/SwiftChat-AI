const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const sanitize = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? DOMPurify.sanitize(obj) : obj;
  }

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      } else if (typeof obj[key] === 'string') {
        obj[key] = DOMPurify.sanitize(obj[key]);
      }
    }
  }
};

const xssSanitize = () => {
  return (req, res, next) => {
    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);
    next();
  };
};

module.exports = { xssSanitize };

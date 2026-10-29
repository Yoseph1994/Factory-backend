const productService = require('../services/product.service');

async function getProducts(req, res, next) {
  try {
    const products = await productService.getProducts();
    res.json(products);
  } catch (err) {
    next(err);
  }
}

async function addProduct(req, res, next) {
  try {
    const product = await productService.addProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const updated = await productService.updateProduct(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const result = await productService.deleteProduct(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct
};

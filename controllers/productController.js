import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";

import fs from "fs";
import slugify from "slugify";
import braintree from "braintree";
import dotenv from "dotenv";

dotenv.config();

const LIST_CACHE_TTL_MS = 15_000;
const productListCache = {
  payloadJson: null,
  expiresAt: 0,
};

const PHOTO_CACHE_TTL_MS = 5 * 60 * 1000;
const photoCache = new Map();

const SINGLE_PRODUCT_CACHE_TTL_MS = 10_000;
const singleProductCache = new Map(); // slug → { payloadJson, expiresAt }

const singleProductInflight = new Map(); // slug → Promise<product>

const RELATED_CACHE_TTL_MS = 10_000;
const relatedProductCache = new Map(); // "pid:cid" → { payloadJson, expiresAt }

const relatedInflight = new Map(); // "pid:cid" → Promise<products[]>

const COUNT_CACHE_TTL_MS = 30_000;
const productCountCache = {
  total: null,
  expiresAt: 0,
};

const clearProductListCache = () => {
  productListCache.payloadJson = null;
  productListCache.expiresAt = 0;
  productCountCache.total = null;
  productCountCache.expiresAt = 0;
};

const clearPhotoCache = (pid) => {
  if (pid) {
    photoCache.delete(String(pid));
  } else {
    photoCache.clear();
  }
};

const clearDetailCaches = () => {
  singleProductCache.clear();
  relatedProductCache.clear();
  singleProductInflight.clear();
  relatedInflight.clear();
  clearPhotoCache();
};

const getCachedProductList = () => {
  if (productListCache.payloadJson && productListCache.expiresAt > Date.now()) {
    return productListCache.payloadJson;
  }
  clearProductListCache();
  return null;
};

const setCachedProductList = (payloadJson) => {
  productListCache.payloadJson = payloadJson;
  productListCache.expiresAt = Date.now() + LIST_CACHE_TTL_MS;
};

export const __clearProductListCacheForTests = clearProductListCache;
export const __clearDetailCachesForTests = clearDetailCaches;

//payment gateway
var gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

export const createProductController = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields;
    const { photo } = req.files;
    //Validation
    switch (true) {
      case !name:
        return res.status(500).send({ error: "Name is Required" });
      case !description:
        return res.status(500).send({ error: "Description is Required" });
      case !price:
        return res.status(500).send({ error: "Price is Required" });
      case !category:
        return res.status(500).send({ error: "Category is Required" });
      case !quantity:
        return res.status(500).send({ error: "Quantity is Required" });
      case photo && photo.size > 1000000:
        return res
          .status(500)
          .send({ error: "Photo is required and should be less than 1 MB" });
    }

    const products = new productModel({ ...req.fields, slug: slugify(name) });
    if (photo) {
      products.photo.data = fs.readFileSync(photo.path);
      products.photo.contentType = photo.type;
    }
    await products.save();
    clearProductListCache();
    clearDetailCaches();
    res.status(201).send({
      success: true,
      message: "Product Created Successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error in Creating Product",
    });
  }
};

//get all products
export const getProductController = async (req, res) => {
  try {
    const cachedPayloadJson = getCachedProductList();
    if (cachedPayloadJson) {
      return res
        .status(200)
        .type("application/json")
        .send(cachedPayloadJson);
    }

    const products = await productModel
      .find({})
      .select("name slug description price quantity shipping createdAt updatedAt")
      .lean()
      .limit(12)
      .sort({ createdAt: -1 });

    const payload = {
      success: true,
      countTotal: products.length,
      message: "All Products Fetched Successfully",
      products,
    };
    setCachedProductList(JSON.stringify(payload));

    res.status(200).send(payload);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in Getting Products",
      error: error.message,
    });
  }
};
// get single product
export const getSingleProductController = async (req, res) => {
  try {
    const { slug } = req.params;

    const cached = singleProductCache.get(slug);
    if (cached && cached.expiresAt > Date.now()) {
      return res.status(200).type("application/json").send(cached.payloadJson);
    }

    let queryPromise = singleProductInflight.get(slug);
    if (!queryPromise) {
      queryPromise = productModel
        .findOne({ slug })
        .select("-photo")
        .lean()
        .then((product) => {
          const payload = { success: true, message: "Single Product Fetched", product };
          const payloadJson = JSON.stringify(payload);
          singleProductCache.set(slug, { payloadJson, expiresAt: Date.now() + SINGLE_PRODUCT_CACHE_TTL_MS });
          singleProductInflight.delete(slug);
          return payloadJson;
        })
        .catch((err) => {
          singleProductInflight.delete(slug);
          throw err;
        });
      singleProductInflight.set(slug, queryPromise);
    }

    const payloadJson = await queryPromise;
    res.status(200).type("application/json").send(payloadJson);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while Getting Single Product",
      error,
    });
  }
};

// get photo
export const productPhotoController = async (req, res) => {
  try {
    const pid = req.params.pid;

    if (!pid || pid === "undefined" || !/^[a-f\d]{24}$/i.test(pid)) {
      return res.status(400).send({ success: false, message: "Invalid product ID" });
    }

    const etag = `"${pid}"`;

    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }

    const cached = photoCache.get(pid);
    if (cached && cached.expiresAt > Date.now()) {
      res.set("Content-Type", cached.contentType);
      res.set("Cache-Control", "public, max-age=86400");
      res.set("ETag", etag);
      return res.status(200).send(cached.data);
    }

    const product = await productModel
      .findById(pid)
      .select("photo")
      .lean();
    if (product?.photo?.data) {
      photoCache.set(pid, {
        data: product.photo.data,
        contentType: product.photo.contentType,
        expiresAt: Date.now() + PHOTO_CACHE_TTL_MS,
      });
      res.set("Content-Type", product.photo.contentType);
      res.set("Cache-Control", "public, max-age=86400");
      res.set("ETag", etag);
      return res.status(200).send(product.photo.data);
    }
    res.status(404).send({ success: false, message: "Photo not found" });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while Getting Photo",
      error,
    });
  }
};

//delete controller
export const deleteProductController = async (req, res) => {
  try {
    await productModel.findByIdAndDelete(req.params.pid).select("-photo");
    clearProductListCache();
    clearPhotoCache(req.params.pid);
    clearDetailCaches();
    res.status(200).send({
      success: true,
      message: "Product Deleted Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while Deleting Product",
      error,
    });
  }
};

//update products
export const updateProductController = async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields;
    const { photo } = req.files;
    //validation
    switch (true) {
      case !name:
        return res.status(500).send({ error: "Name is Required" });
      case !description:
        return res.status(500).send({ error: "Description is Required" });
      case !price:
        return res.status(500).send({ error: "Price is Required" });
      case !category:
        return res.status(500).send({ error: "Category is Required" });
      case !quantity:
        return res.status(500).send({ error: "Quantity is Required" });
      case photo && photo.size > 1000000:
        return res
          .status(500)
          .send({ error: "Photo is required and should be less than 1 MB" });
    }

    const products = await productModel.findByIdAndUpdate(
      req.params.pid,
      { ...req.fields, slug: slugify(name) },
      { new: true }
    );
    if (photo) {
      products.photo.data = fs.readFileSync(photo.path);
      products.photo.contentType = photo.type;
    }
    await products.save();
    clearProductListCache();
    clearPhotoCache(req.params.pid);
    clearDetailCaches();
    res.status(201).send({
      success: true,
      message: "Product Updated Successfully",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error in Updating product",
    });
  }
};

// filters
export const productFiltersController = async (req, res) => {
  try {
    const { checked, radio } = req.body;
    let args = {};
    if (checked.length > 0) args.category = checked;
    if (radio.length) args.price = { $gte: radio[0], $lte: radio[1] };
    const products = await productModel.find(args).select("-photo").lean();
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error While Filtering Products",
      error,
    });
  }
};

// product count
export const productCountController = async (req, res) => {
  try {
    if (productCountCache.total !== null && productCountCache.expiresAt > Date.now()) {
      return res.status(200).send({ success: true, total: productCountCache.total });
    }

    const total = await productModel.estimatedDocumentCount();
    productCountCache.total = total;
    productCountCache.expiresAt = Date.now() + COUNT_CACHE_TTL_MS;
    res.status(200).send({
      success: true,
      total,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      message: "Error in Product Count",
      error,
      success: false,
    });
  }
};

// product list based on page
export const productListController = async (req, res) => {
  try {
    const perPage = 6;
    const page = req.params.page ? Number(req.params.page) : 1;
    const after = req.query.after;

    let query = {};
    if (after) {
      query._id = { $lt: after };
    }

    const products = await productModel
      .find(query)
      .select("-photo")
      .skip(after ? 0 : (page - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).send({
      success: true,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error in per page product list",
      error,
    });
  }
};

// search product
export const searchProductController = async (req, res) => {
  try {
    const { keyword } = req.params;
    const results = await productModel
      .find({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
        ],
      })
      .select("-photo");
    res.json(results);
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error in Search Product API",
      error,
    });
  }
};

// similar products
export const relatedProductController = async (req, res) => {
  try {
    const { pid, cid } = req.params;
    const cacheKey = `${pid}:${cid}`;

    const cached = relatedProductCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.status(200).type("application/json").send(cached.payloadJson);
    }

    let queryPromise = relatedInflight.get(cacheKey);
    if (!queryPromise) {
      queryPromise = productModel
        .find({ category: cid, _id: { $ne: pid } })
        .select("-photo")
        .limit(3)
        .sort({ createdAt: -1 })
        .lean()
        .then((products) => {
          const payload = { success: true, products };
          const payloadJson = JSON.stringify(payload);
          relatedProductCache.set(cacheKey, { payloadJson, expiresAt: Date.now() + RELATED_CACHE_TTL_MS });
          relatedInflight.delete(cacheKey);
          return payloadJson;
        })
        .catch((err) => {
          relatedInflight.delete(cacheKey);
          throw err;
        });
      relatedInflight.set(cacheKey, queryPromise);
    }

    const payloadJson = await queryPromise;
    res.status(200).type("application/json").send(payloadJson);
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error while Getting Related Product",
      error,
    });
  }
};

// get products by category
export const productCategoryController = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ slug: req.params.slug }).lean();
    const products = await productModel
      .find({ category: category?._id })
      .select("-photo")
      .lean();
    res.status(200).send({
      success: true,
      category,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      error,
      message: "Error while Getting Products by Category",
    });
  }
};

//payment gateway api
//token
export const braintreeTokenController = async (req, res) => {
  try {
    gateway.clientToken.generate({}, function (err, response) {
      if (err) {
        res.status(500).send(err);
      } else {
        res.send(response);
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
};

//payment
export const brainTreePaymentController = async (req, res) => {
  try {
    const { nonce, cart } = req.body;
    let total = 0;
    cart.map((i) => {
      total += i.price;
    });
    let newTransaction = gateway.transaction.sale(
      {
        amount: total,
        paymentMethodNonce: nonce,
        options: {
          submitForSettlement: true,
        },
      },
      function (error, result) {
        if (result) {
          const order = new orderModel({
            products: cart,
            payment: result,
            buyer: req.user._id,
          }).save();
          res.json({ ok: true });
        } else {
          res.status(500).send(error);
        }
      }
    );
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
};
import braintree from "braintree";
const { mockGenerate, mockSale } = braintree.__mocks;

jest.mock("dotenv", () => ({ config: jest.fn() }));

jest.mock("fs", () => ({
  __esModule: true,
    default: { readFileSync: jest.fn() },
}));

jest.mock("slugify", () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock("braintree", () => {
  const mockGenerate = jest.fn();
  const mockSale = jest.fn();

  const BraintreeGateway = jest.fn(() => ({
    clientToken: { generate: mockGenerate },
    transaction: { sale: mockSale },
  }));

  return {
    __esModule: true,
    default: {
      Environment: { Sandbox: "Sandbox" },
      BraintreeGateway,
      __mocks: { mockGenerate, mockSale }, 
    },
  };
});



jest.mock("../models/productModel.js", () => {
  const saveSpy = jest.fn();

  const ProductCstr = jest.fn((doc) => ({
    ...doc,
    photo: { data: null, contentType: null },
    save: saveSpy,
  }));

  ProductCstr.find = jest.fn();
  ProductCstr.findOne = jest.fn();
  ProductCstr.findById = jest.fn();
  ProductCstr.findByIdAndDelete = jest.fn();
  ProductCstr.findByIdAndUpdate = jest.fn();

  ProductCstr.__saveSpy = saveSpy;

  return { __esModule: true, default: ProductCstr };
});

jest.mock("../models/categoryModel.js", () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));


import fs from "fs";
import slugify from "slugify";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import {
  createProductController,
  getProductController,
  getSingleProductController,
  productPhotoController,
  deleteProductController,
  updateProductController,
  productFiltersController,
  productCountController,
  productListController,
  searchProductController,
  relatedProductController,
  productCategoryController,
  braintreeTokenController,
  brainTreePaymentController,
} from "./productController.js";

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const chainQuery = (finalValue, { reject = false } = {}) => {
  const q = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
  };


  q.then = (resolve, rejectFn) =>
    (reject ? Promise.reject(finalValue) : Promise.resolve(finalValue)).then(
    resolve,
    rejectFn
    );

  return q;
};

const razerFields = {
  name: "Razer Viper V3 Pro Wireless Gaming Mouse",
  description:
    "Ultra-lightweight esports wireless mouse with optical sensor, low-latency wireless, and up to ~95 hours battery life (varies by settings).",
  price: 215,
  category: "65f1b7c2c9a1d4b3e2f0a111",
  quantity: 1,
  shipping: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore?.();
});

describe("createProductController", () => {
  it("should return 500 when name is missing", async () => {
    const req = { fields: { ...razerFields, name: "" }, files: {} };
    const res = makeRes();

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
    expect(productModel).not.toHaveBeenCalled();
  });

  it("should return 500 when description is missing", async () => {
    const req = { fields: { ...razerFields, description: "" }, files: {} };
    const res = makeRes();

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });
    expect(productModel).not.toHaveBeenCalled();
  });

  it("should return 500 when price is missing", async () => {
    const req = { fields: { ...razerFields, price: "" }, files: {} };
    const res = makeRes();

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
    expect(productModel).not.toHaveBeenCalled();
  });

  it("should return 500 when category is missing", async () => {
    const req = { fields: { ...razerFields, category: "" }, files: {} };
    const res = makeRes();

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
    expect(productModel).not.toHaveBeenCalled();
  });

  it("should return 500 when quantity is missing", async () => {
    const req = { fields: { ...razerFields, quantity: "" }, files: {} };
    const res = makeRes();

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
    expect(productModel).not.toHaveBeenCalled();
  });

  it("should return 500 when photo is > 1MB", async () => {
    const req = {
      fields: razerFields,
      files: { photo: { size: 1000001, path: "/tmp/x.jpg", type: "image/jpeg" } },
    };
    const res = makeRes();

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: "Photo is required and should be less than 1 MB",
    });
    expect(productModel).not.toHaveBeenCalled();
  });

  it("should create product successfully (no photo)", async () => {
    const req = { fields: razerFields, files: {} };
    const res = makeRes();

    slugify.mockReturnValueOnce("razer-viper-v3-pro-wireless-gaming-mouse");
    productModel.__saveSpy.mockResolvedValueOnce(undefined);

    await createProductController(req, res);

    expect(slugify).toHaveBeenCalledWith(razerFields.name);
    expect(productModel).toHaveBeenCalledWith({
      ...razerFields,
      slug: "razer-viper-v3-pro-wireless-gaming-mouse",
    });
    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(productModel.__saveSpy).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Product Created Successfully",
      })
    );
  });

  it("should create product successfully (with photo)", async () => {
    const req = {
      fields: razerFields,
      files: {
        photo: {
        size: 380000,
        path: "/tmp/razer-viper-v3-pro.jpg",
        type: "image/jpeg",
        },
      },
    };
    const res = makeRes();

    slugify.mockReturnValueOnce("razer-viper-v3-pro-wireless-gaming-mouse");
    fs.readFileSync.mockReturnValueOnce(Buffer.from("fake-image"));
    productModel.__saveSpy.mockResolvedValueOnce(undefined);

    await createProductController(req, res);

    expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/razer-viper-v3-pro.jpg");
    expect(productModel.__saveSpy).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Product Created Successfully",
        })
      );

      const created = productModel.mock.results[0].value;
      expect(created.photo.data).toEqual(Buffer.from("fake-image"));
      expect(created.photo.contentType).toBe("image/jpeg");
    });

  it("should return 500 when save throws (unexpected error)", async () => {
    const req = { fields: razerFields, files: {} };
    const res = makeRes();

    slugify.mockReturnValueOnce("razer-viper-v3-pro-wireless-gaming-mouse");
    const err = new Error("db save failed");
    productModel.__saveSpy.mockRejectedValueOnce(err);

    await createProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in Creating Product",
        error: err,
      })
    );
  });
});

// Khoo Jing Xiang, A0252605L
describe("getProductController", () => {
  it("should return products (with chained query)", async () => {
    const mockProducts = [
      { _id: "1", name: "Razer Viper V3 Pro" },
      { _id: "2", name: "Nitendo Switch 2" },
    ];

    const q = chainQuery(mockProducts);
    productModel.find.mockReturnValue(q);

    const req = {};
    const res = makeRes();

    await getProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(q.populate).toHaveBeenCalledWith("category");
    expect(q.select).toHaveBeenCalledWith("-photo");
    expect(q.limit).toHaveBeenCalledWith(12);
    expect(q.sort).toHaveBeenCalledWith({ createdAt: -1 });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      countTotal: mockProducts.length,
      message: "All Products Fetched Successfully",
      products: mockProducts,
    });
  });

  it("should send an error payload when query fails", async () => {
    const err = new Error("db error");
    const q = chainQuery(err, { reject: true });
    productModel.find.mockReturnValue(q);

    const req = {};
    const res = makeRes();

    await getProductController(req, res);

    expect(console.log).toHaveBeenCalledWith(err);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in Getting Products",
      error: err.message,
    });
  });
});

// Khoo Jing Xiang, A0252605L
describe("getSingleProductController", () => {
  it("should return a single product by slug", async () => {
    const mockProduct = { _id: "p1", slug: "razer-viper-v3-pro", name: "Razer" };
    const q = chainQuery(mockProduct);

    productModel.findOne.mockReturnValue(q);

    const req = { params: { slug: "razer-viper-v3-pro" } };
    const res = makeRes();

    await getSingleProductController(req, res);

    expect(productModel.findOne).toHaveBeenCalledWith({
      slug: "razer-viper-v3-pro",
    });
    expect(q.select).toHaveBeenCalledWith("-photo");
    expect(q.populate).toHaveBeenCalledWith("category");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Single Product Fetched",
      product: mockProduct,
    });
  });

  it("should send an error payload when query fails", async () => {
    const err = new Error("findOne failed");
    const q = chainQuery(err, { reject: true });
    productModel.findOne.mockReturnValue(q);

    const req = { params: { slug: "razer-viper-v3-pro" } };
    const res = makeRes();

    await getSingleProductController(req, res);

    expect(console.log).toHaveBeenCalledWith(err);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while Getting Single Product",
      error: err,
    });
  });
});

// Khoo Jing Xiang, A0252605L
describe("productPhotoController", () => {
  it("should set a Content-type and returns photo data when present", async () => {
    const photoBuf = Buffer.from("img");
    const mockProduct = {
      photo: { data: photoBuf, contentType: "image/jpeg" },
    };

    const q = {
      select: jest.fn().mockResolvedValue(mockProduct),
    };
    productModel.findById.mockReturnValue(q);

    const req = { params: { pid: "p1" } };
    const res = makeRes();

    await productPhotoController(req, res);

    expect(productModel.findById).toHaveBeenCalledWith("p1");
    expect(q.select).toHaveBeenCalledWith("photo");

    expect(res.set).toHaveBeenCalledWith("Content-type", "image/jpeg");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(photoBuf);
  });

  it("should do nothing if photo.data missing (no response sent)", async () => {
    const mockProduct = { photo: { data: null, contentType: "image/jpeg" } };
    const q = { select: jest.fn().mockResolvedValue(mockProduct) };
    productModel.findById.mockReturnValue(q);

    const req = { params: { pid: "p1" } };
    const res = makeRes();

    await productPhotoController(req, res);

    expect(res.set).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it("should send an error payload when query fails", async () => {
    const err = new Error("photo query failed");
    const q = { select: jest.fn().mockRejectedValue(err) };
    productModel.findById.mockReturnValue(q);

    const req = { params: { pid: "p1" } };
    const res = makeRes();

    await productPhotoController(req, res);

    expect(console.log).toHaveBeenCalledWith(err);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while Getting Photo",
      error: err,
    });
  });
});

describe("deleteProductController", () => {
  it("should delete product and returns success", async () => {
    const chain = { select: jest.fn().mockResolvedValue(undefined) };
    productModel.findByIdAndDelete.mockReturnValue(chain);

    const req = { params: { pid: "p1" } };
    const res = makeRes();

    await deleteProductController(req, res);

    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("p1");
    expect(chain.select).toHaveBeenCalledWith("-photo");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Deleted Successfully",
    });
  });
});

  it("should send an error payload when delete fails", async () => {
    const err = new Error("delete failed");
    // if controller does: await productModel.findByIdAndDelete(...).select(...)
    // then findByIdAndDelete must return object with select() that rejects.
    const chain = { select: jest.fn().mockRejectedValue(err) };
    productModel.findByIdAndDelete.mockReturnValue(chain);

    const req = { params: { pid: "p1" } };
    const res = makeRes();

    await deleteProductController(req, res);

    expect(console.log).toHaveBeenCalledWith(err);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while Deleting Product",
      error: err,
    });
  });

   
describe("updateProductController", () => {
  it("should return 500 when name is missing", async () => {
    const req = {
      params: { pid: "p1" },
      fields: { ...razerFields, name: "" },
      files: {},
    };
    const res = makeRes();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
    expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should return 500 when description is missing", async () => {
    const req = {
      params: { pid: "p1" },
      fields: { ...razerFields, description: "" },
      files: {},
    };
    const res = makeRes();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Description is Required" });
    expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should return 500 when price is missing", async () => {
    const req = {
      params: { pid: "p1" },
      fields: { ...razerFields, price: "" },
      files: {},
    };
    const res = makeRes();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
    expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should return 500 when category is missing", async () => {
    const req = {
      params: { pid: "p1" },
      fields: { ...razerFields, category: "" },
      files: {},
    };
    const res = makeRes();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
    expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should return 500 when quantity is missing", async () => {
    const req = {
      params: { pid: "p1" },
      fields: { ...razerFields, quantity: "" },
      files: {},
    };
    const res = makeRes();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
    expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should return 500 when photo > 1MB", async () => {
    const req = {
      params: { pid: "p1" },
      fields: { ...razerFields },
      files: { photo: { size: 1000001, path: "/tmp/big.jpg", type: "image/jpeg" } },
    };
    const res = makeRes();

    await updateProductController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      error: "Photo is required and should be less than 1 MB",
    });
    expect(productModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should update product successfully (no photo)", async () => {
    const req = {
      params: { pid: "p1" },
      fields: { ...razerFields },
      files: {},
    };
    const res = makeRes();

    slugify.mockReturnValueOnce("razer-viper-v3-pro-wireless-gaming-mouse");

    const save = jest.fn().mockResolvedValueOnce(undefined);
    const updatedDoc = { photo: { data: null, contentType: null }, save };

    productModel.findByIdAndUpdate.mockResolvedValueOnce(updatedDoc);

    await updateProductController(req, res);

    expect(slugify).toHaveBeenCalledWith(razerFields.name);
    expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "p1",
      { ...razerFields, slug: "razer-viper-v3-pro-wireless-gaming-mouse" },
      { new: true }
    );
    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Product Updated Successfully",
        products: updatedDoc,
      })
    );
  });

  it("should update product successfully (with photo)", async () => {
    const req = {
      params: { pid: "p1" },
      fields: { ...razerFields },
      files: {
        photo: {
          size: 380000,
          path: "/tmp/razer-viper-v3-pro.jpg",
          type: "image/jpeg",
        },
      },
    };
    const res = makeRes();

    slugify.mockReturnValueOnce("razer-viper-v3-pro-wireless-gaming-mouse");
    fs.readFileSync.mockReturnValueOnce(Buffer.from("fake-image"));

    const save = jest.fn().mockResolvedValueOnce(undefined);
    const updatedDoc = { photo: { data: null, contentType: null }, save };

    productModel.findByIdAndUpdate.mockResolvedValueOnce(updatedDoc);

    await updateProductController(req, res);

    expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/razer-viper-v3-pro.jpg");
    expect(updatedDoc.photo.data).toEqual(Buffer.from("fake-image"));
    expect(updatedDoc.photo.contentType).toBe("image/jpeg");
    expect(save).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("should return 500 when update throws an error", async () => {
    const req = {
      params: { pid: "p1" },
      fields: { ...razerFields },
      files: {},
    };
    const res = makeRes();

    const err = new Error("update failed");
    productModel.findByIdAndUpdate.mockRejectedValueOnce(err);

    await updateProductController(req, res);

    expect(console.log).toHaveBeenCalledWith(err);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in Updating product",
        error: err,
      })
    );
  });
});

// Khoo Jing Xiang, A0252605L
describe("productFiltersController", () => {
  it("should filter by category and price", async () => {
    const req = { body: { checked: ["electronics", "gadgets"], radio: [100, 300] } };
    const res = makeRes();

    const filtered = [{ _id: "p1" }];
    productModel.find.mockResolvedValueOnce(filtered);

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      category: ["electronics", "gadgets"],
      price: { $gte: 100, $lte: 300 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products: filtered });
  });

  it("should filter by category only", async () => {
    const req = { body: { checked: ["electronics"], radio: [] } };
    const res = makeRes();

    const filtered = [{ _id: "p1" }];
    productModel.find.mockResolvedValueOnce(filtered);

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({ category: ["electronics"] });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should filter by price only", async () => {
    const req = { body: { checked: [], radio: [10, 20] } };
    const res = makeRes();

    const filtered = [{ _id: "p1" }];
    productModel.find.mockResolvedValueOnce(filtered);

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      price: { $gte: 10, $lte: 20 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return all when no filters", async () => {
    const req = { body: { checked: [], radio: [] } };
    const res = makeRes();

    const filtered = [{ _id: "p1" }];
    productModel.find.mockResolvedValueOnce(filtered);

    await productFiltersController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return 400 when find fails", async () => {
    const req = { body: { checked: [], radio: [] } };
    const res = makeRes();

    const err = new Error("filter fail");
    productModel.find.mockRejectedValueOnce(err);

    await productFiltersController(req, res);

    expect(console.log).toHaveBeenCalledWith(err);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error While Filtering Products",
      error: err,
    });
  });
});

// Khoo Jing Xiang, A0252605L
describe("productCountController", () => {
  it("should return count on success", async () => {
    const req = {};
    const res = makeRes();

    const chain = { estimatedDocumentCount: jest.fn().mockResolvedValueOnce(42) };
    productModel.find.mockReturnValueOnce(chain);

    await productCountController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(chain.estimatedDocumentCount).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, total: 42 });
  });

  it("should return 400 when count fails", async () => {
    const req = {};
    const res = makeRes();

    const err = new Error("count fail");
    const chain = { estimatedDocumentCount: jest.fn().mockRejectedValueOnce(err) };
    productModel.find.mockReturnValueOnce(chain);

    await productCountController(req, res);

    expect(console.log).toHaveBeenCalledWith(err);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      message: "Error in Product Count",
      error: err,
      success: false,
    });
  });
});

// Khoo Jing Xiang, A0252605L
describe("productListController", () => {
  // skip ==6
  it("should return page 2 of products", async () => {
    const req = { params: { page: 2 } };
    const res = makeRes();

    const mockProducts = [{ _id: "p1" }];

    const q = {
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
    };
    q.then = (resolve, reject) => Promise.resolve(mockProducts).then(resolve, reject);

    productModel.find.mockReturnValueOnce(q);

    await productListController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({});
    expect(q.select).toHaveBeenCalledWith("-photo");
    expect(q.skip).toHaveBeenCalledWith(6);
    expect(q.limit).toHaveBeenCalledWith(6);
    expect(q.sort).toHaveBeenCalledWith({ createdAt: -1 });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products: mockProducts });
  });

  // skip == 0
  it("should default to page 1 when page is missing", async () => {
    const req = { params: {} };
    const res = makeRes();

    const mockProducts = [{ _id: "p1" }];

    const q = {
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
    };
    q.then = (resolve, reject) => Promise.resolve(mockProducts).then(resolve, reject);

    productModel.find.mockReturnValueOnce(q);

    await productListController(req, res);

    expect(q.skip).toHaveBeenCalledWith(0);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should return 400 when query fails", async () => {
    const req = { params: { page: 1 } };
    const res = makeRes();

    const err = new Error("list fail");

    const q = {
      select: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
    };
    q.then = (resolve, reject) => Promise.reject(err).then(resolve, reject);

    productModel.find.mockReturnValueOnce(q);

    await productListController(req, res);

    expect(console.log).toHaveBeenCalledWith(err);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in per page product list",
      error: err,
    });
  });
});

// Khoo Jing Xiang, A0252605L
describe("searchProductController", () => {
  it("should return search results on success", async () => {
    const req = { params: { keyword: "razer" } };
    const res = makeRes();

    const results = [{ _id: "p1", name: "Razer Viper V3 Pro" }];

    const q = { select: jest.fn().mockResolvedValueOnce(results) };
    productModel.find.mockReturnValueOnce(q);

    await searchProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: "razer", $options: "i" } },
        { description: { $regex: "razer", $options: "i" } },
      ],
    });
    expect(q.select).toHaveBeenCalledWith("-photo");
    expect(res.json).toHaveBeenCalledWith(results);
  });

  it("should return 400 when search fails", async () => {
    const req = { params: { keyword: "razer" } };
    const res = makeRes();

    const err = new Error("search fail");
    const q = { select: jest.fn().mockRejectedValueOnce(err) };
    productModel.find.mockReturnValueOnce(q);

    await searchProductController(req, res);

    expect(console.log).toHaveBeenCalledWith(err);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in Search Product API",
      error: err,
    });
  });
});

// Khoo Jing Xiang, A0252605L
describe("relatedProductController", () => {
  it("should return related products", async () => {
    const req = { params: { pid: "p1", cid: "c1" } };
    const res = makeRes();

    const related = [{ _id: "p2" }, { _id: "p3" }];

    const q = {
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
    };
    q.then = (resolve, reject) => Promise.resolve(related).then(resolve, reject);

    productModel.find.mockReturnValueOnce(q);

    await relatedProductController(req, res);

    expect(productModel.find).toHaveBeenCalledWith({
      category: "c1",
      _id: { $ne: "p1" },
    });
    expect(q.select).toHaveBeenCalledWith("-photo");
    expect(q.limit).toHaveBeenCalledWith(3);
    expect(q.populate).toHaveBeenCalledWith("category");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ success: true, products: related });
  });

  it("should return 400 when query fails", async () => {
    const req = { params: { pid: "p1", cid: "c1" } };
    const res = makeRes();

    const err = new Error("related fail");

    const q = {
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
    };
    q.then = (resolve, reject) => Promise.reject(err).then(resolve, reject);

    productModel.find.mockReturnValueOnce(q);

    await relatedProductController(req, res);

    expect(console.log).toHaveBeenCalledWith(err);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while Getting Related Product",
      error: err,
    });
  });
});

// Khoo Jing Xiang, A0252605L
describe("productCategoryController", () => {
  it("should return products by category", async () => {
    const req = { params: { slug: "mouse" } };
    const res = makeRes();

    const cat = { _id: "c1", slug: "mouse" };
    categoryModel.findOne.mockResolvedValueOnce(cat);

    const prods = [{ _id: "p1" }];

    const q = { populate: jest.fn().mockResolvedValueOnce(prods) };
    productModel.find.mockReturnValueOnce(q);

    await productCategoryController(req, res);

    expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "mouse" });
    expect(productModel.find).toHaveBeenCalledWith({ category: cat });
    expect(q.populate).toHaveBeenCalledWith("category");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      category: cat,
      products: prods,
    });
  });

  it("should return 400 when category query fails", async () => {
    const req = { params: { slug: "mouse" } };
    const res = makeRes();

    const err = new Error("cat fail");
    categoryModel.findOne.mockRejectedValueOnce(err);

    await productCategoryController(req, res);

    expect(console.log).toHaveBeenCalledWith(err);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      error: err,
      message: "Error while Getting Products by Category",
    });
  });
});

  
// Earnest Suprapmo, A0251966U
describe("braintreeTokenController", () => {
  it("should send client token on success", async () => {
    // Arrange
    const req = {};
    const res = makeRes();
    mockGenerate.mockImplementationOnce((_, cb) =>
      cb(null, { clientToken: "token123" })
    );

    // Act
    await braintreeTokenController(req, res);

    // Assert
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ clientToken: "token123" });
  });

  it("should return 500 when gateway returns error", async () => {
    // Arrange
    const req = {};
    const res = makeRes();
    const err = new Error("token fail");
    mockGenerate.mockImplementationOnce((_, cb) => cb(err));

    // Act
    await braintreeTokenController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(err);
  });

  it("logs an error and returns 500 when clientToken.generate throws synchronously", async () => {
    // Arrange
    const error = new Error("sync token error");
    mockGenerate.mockImplementationOnce(() => {
      throw error;
    });
    const req = {};
    const res = makeRes();
    const consoleSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => {});

    // Act
    await braintreeTokenController(req, res);

    // Assert
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(error);

    consoleSpy.mockRestore();
  });
});

// Mocks for Order model used in brainTreePaymentController
const mockOrderSave = jest.fn();
const mockOrderModel = jest.fn(() => ({
  save: mockOrderSave,
}));

jest.mock("../models/orderModel.js", () => ({
  __esModule: true,
  default: function (...args) {
    return mockOrderModel(...args);
  },
}));

// Earnest Suprapmo, A0251966U
describe("brainTreePaymentController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an order and responds ok when transaction succeeds", async () => {
    // Arrange
    const cart = [
      { _id: "p1", price: 10 },
      { _id: "p2", price: 20 },
    ];
    const nonce = "fake-nonce";
    const req = {
      body: { nonce, cart },
      user: { _id: "user-1" },
    };
    const res = makeRes();
    const transactionResult = { id: "txn-123" };

    mockSale.mockImplementation((params, callback) => {
      callback(null, transactionResult);
    });

    // Act
    await brainTreePaymentController(req, res);

    // Assert
    expect(mockSale).toHaveBeenCalledTimes(1);
    const [saleParams] = mockSale.mock.calls[0];
    expect(saleParams).toMatchObject({
      amount: 30,
      paymentMethodNonce: nonce,
      options: { submitForSettlement: true },
    });

    expect(mockOrderModel).toHaveBeenCalledWith({
      products: cart,
      payment: transactionResult,
      buyer: "user-1",
    });
    expect(mockOrderSave).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(res.status).not.toHaveBeenCalledWith(500);
  });

  it("returns 500 when transaction fails", async () => {
    // Arrange
    const cart = [{ _id: "p1", price: 10 }];
    const nonce = "bad-nonce";
    const req = {
      body: { nonce, cart },
      user: { _id: "user-1" },
    };
    const res = makeRes();
    const error = new Error("transaction error");

    mockSale.mockImplementation((params, callback) => {
      callback(error, null);
    });

    // Act
    await brainTreePaymentController(req, res);

    // Assert
    expect(mockSale).toHaveBeenCalledTimes(1);
    expect(mockOrderModel).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(error);
  });

  it("logs an error and returns 500 when transaction.sale throws synchronously", async () => {
    // Arrange
    const cart = [{ _id: "p1", price: 10 }];
    const nonce = "sync-error-nonce";
    const req = {
      body: { nonce, cart },
      user: { _id: "user-1" },
    };
    const res = makeRes();
    const error = new Error("sync transaction error");

    mockSale.mockImplementation(() => {
      throw error;
    });

    const consoleSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => {});

    // Act
    await brainTreePaymentController(req, res);

    // Assert
    expect(mockSale).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

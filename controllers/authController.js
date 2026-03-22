import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";

import { comparePassword, hashPassword } from "./../helpers/authHelper.js";
import JWT from "jsonwebtoken";

const MAX_EMAIL_LENGTH = 254;

const isValidEmail = (email) => {
  if (!email || email.length > MAX_EMAIL_LENGTH) {
    return false;
  }
  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex === email.length - 1) {
    return false;
  }
  const lastDotIndex = email.lastIndexOf(".");
  if (lastDotIndex <= atIndex + 1 || lastDotIndex === email.length - 1) {
    return false;
  }
  return true;
};

export const registerController = async (req, res) => {
  try {
    const { name, email, password, phone, address, answer } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const validPhonePattern = /^\+?\d{8,15}$/;

    // Validations
    if (!name) {
      return res
        .status(400)
        .send({ success: false, message: "Name is Required" });
    }
    if (!email) {
      return res
        .status(400)
        .send({ success: false, message: "Email is Required" });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).send({
        success: false,
        message: "Please enter a valid email address",
      });
    }
    if (!password) {
      return res
        .status(400)
        .send({ success: false, message: "Password is Required" });
    }
    if (password.length < 6) {
      return res.status(400).send({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }
    if (!phone) {
      return res
        .status(400)
        .send({ success: false, message: "Phone no is Required" });
    }
    if (!validPhonePattern.test(phone.trim())) {
      return res.status(400).send({
        success: false,
        message: "Please enter a valid phone number",
      });
    }
    if (!address) {
      return res.status(400).send({ success: false, message: "Address is Required" });
    }
    if (!answer) {
      return res.status(400).send({ success: false, message: "Answer is Required" });
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).send({
        success: false,
        message: "This email has already been registered. Please login",
      });
    }

    // Register user
    const hashedPassword = await hashPassword(password);
    const user = await new userModel({
      name,
      email: normalizedEmail,
      phone,
      address,
      password: hashedPassword,
      answer,
    }).save();

    return res.status(201).send({
      success: true,
      message: "User Registered Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error registering user",
    });
  }
};

export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    // Validation
    if (!email) {
      return res.status(400).send({
        success: false,
        message: "Email is required",
      });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).send({
        success: false,
        message: "Please enter a valid email address",
      });
    }
    if (!password) {
      return res.status(400).send({
        success: false,
        message: "Password is required",
      });
    }
    // Check if user exists
    const user = await userModel.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).send({
        success: false,
        message: "No account found with this email",
      });
    }
    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.status(401).send({
        success: false,
        message: "Incorrect password",
      });
    }

    // Create JWT token
    const token = JWT.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).send({
      success: true,
      message: "Login Successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error during Login",
    });
  }
};

export const forgotPasswordController = async (req, res) => {
  try {
    const { email, answer, newPassword } = req.body;

    // Validation
    if (!email) {
      return res.status(400).send({ success: false, message: "Email is required" });
    }
    if (!answer) {
      return res.status(400).send({ success: false, message: "Answer is required" });
    }
    if (!newPassword) {
      return res.status(400).send({ success: false, message: "New password is required" });
    }
    
    // Check if user exists
    const user = await userModel.findOne({ email, answer });
    if (!user) {
      return res.status(401).send({
        success: false,
        message: "Wrong Email Or Answer",
      });
    }

    // Hash new password and update
    const hashed = await hashPassword(newPassword);
    await userModel.findByIdAndUpdate(user._id, { password: hashed });
    return res.status(200).send({
      success: true,
      message: "Password Reset Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error in forgot password",
    });
  }
};

export const testController = (req, res) => {
    return res.status(200).send({
        success: true,
        message: "Protected Routes",
    }); 
};

//update profile
export const updateProfileController = async (req, res) => {
  try {
    const { name, email, password, address, phone } = req.body;
    const user = await userModel.findById(req.user._id);
    //password
    if (password && password.length < 6) {
      return res.status(400).json({ error: "Password is required to be at least 6 characters long" });
    }
    const hashedPassword = password ? await hashPassword(password) : undefined;
    const updatedUser = await userModel.findByIdAndUpdate(
      req.user._id,
      {
        name: name || user.name,
        password: hashedPassword || user.password,
        phone: phone || user.phone,
        address: address || user.address,
      },
      { new: true }
    );
    res.status(200).send({
      success: true,
      message: "Profile Updated Successfully",
      updatedUser,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: "Error While Updating Profile",
      error,
    });
  }
};

//orders
export const getOrdersController = async (req, res) => {
  try {
    const orders = await orderModel
      .find({ buyer: req.user._id })
      .populate("products", "-photo")
      .populate("buyer", "name");
    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error While Getting Orders",
      error,
    });
  }
};
//all orders
export const getAllOrdersController = async (req, res) => {
  try {
    const orders = await orderModel
      .find({})
      .populate("products", "-photo")
      .populate("buyer", "name")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error While Getting Orders",
      error,
    });
  }
};

//order status
export const orderStatusController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const orders = await orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );
    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error While Updating Order",
      error,
    });
  }
};

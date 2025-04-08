const Asset = require('../models/Asset');
const { validationResult } = require('express-validator');

exports.createAsset = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const assetId = await Asset.create(req.body);
    res.status(201).json({ 
      message: '资产创建成功',
      id: assetId 
    });
  } catch (error) {
    res.status(500).json({ 
      message: '资产创建失败',
      error: error.message 
    });
  }
};

exports.getAssetsByBranch = async (req, res) => {
  try {
    const assets = await Asset.findByBranch(req.params.branch);
    res.json({
      message: '获取资产列表成功',
      data: assets
    });
  } catch (error) {
    res.status(500).json({ 
      message: '获取资产列表失败',
      error: error.message 
    });
  }
};

exports.updateAssetStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to } = req.body;
    
    const updated = await Asset.updateStatus(id, status, assigned_to);
    if (!updated) {
      return res.status(404).json({ message: '资产不存在' });
    }
    
    res.json({ 
      message: '资产状态更新成功'
    });
  } catch (error) {
    res.status(500).json({ 
      message: '资产状态更新失败',
      error: error.message 
    });
  }
};

exports.getAllAssets = async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      status: req.query.status,
      branch: req.query.branch
    };
    
    const assets = await Asset.getAll(filters);
    res.json({
      message: '获取资产列表成功',
      data: assets
    });
  } catch (error) {
    res.status(500).json({ 
      message: '获取资产列表失败',
      error: error.message 
    });
  }
}; 
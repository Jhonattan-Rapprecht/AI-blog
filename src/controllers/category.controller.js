const CategoryModel = require('../models/category.model');

class CategoryController {
    async getAll(req, res) {
        try {
            const categories = await CategoryModel.findAll();
            res.json(categories);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async create(req, res) {
        try {
            const { name, description } = req.body;
            if (!name) return res.status(400).json({ error: 'Name is required' });

            // Simple slug generation for categories
            const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

            const id = await CategoryModel.create({ name, slug, description });
            res.status(201).json({ id, name, slug });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new CategoryController();

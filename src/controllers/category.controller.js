const CategoryModel = require('../models/category.model');
const { sendUnexpectedError } = require('../utils/http-errors');

class CategoryController {
    async getAll(req, res) {
        try {
            const categories = await CategoryModel.findAll();
            res.json(categories);
        } catch (error) { return sendUnexpectedError(res, 'Categories list', error, 'Could not load categories.'); }
    }

    async create(req, res) {
        try {
            const { name, description } = req.body;
            if (!name) return res.status(400).json({ error: 'Name is required' });

            // Simple slug generation for categories
            const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

            const id = await CategoryModel.create({ name, slug, description });
            res.status(201).json({ id, name, slug });
        } catch (error) { return sendUnexpectedError(res, 'Categories create', error, 'Could not create category.'); }
    }

    async delete(req, res) {
        try {
            const category = await CategoryModel.findById(req.params.id);
            const deleted = await CategoryModel.delete(req.params.id);
            if (!deleted) return res.status(404).json({ error: 'Category not found' });
            req.activityTargetLabel = category?.name || null;
            res.status(204).end();
        } catch (error) { return sendUnexpectedError(res, 'Categories delete', error, 'Could not delete category.'); }
    }
}

module.exports = new CategoryController();

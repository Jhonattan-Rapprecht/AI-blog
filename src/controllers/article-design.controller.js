const { getArticleDesignCatalog } = require('../config/article-design.config');

class ArticleDesignController {
    getCatalog(req, res) {
        // Phase 1 is intentionally read-only: no design configuration is stored yet.
        res.json(getArticleDesignCatalog());
    }
}

module.exports = new ArticleDesignController();

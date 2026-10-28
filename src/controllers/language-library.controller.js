const { getLanguageLibraryCatalog } = require('../config/language-library.config');

class LanguageLibraryController {
    getCatalog(req, res) {
        res.json(getLanguageLibraryCatalog());
    }
}

module.exports = new LanguageLibraryController();

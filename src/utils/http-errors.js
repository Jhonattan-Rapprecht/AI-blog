function errorDetails(error) {
    return {
        name: error?.name || 'Error',
        code: error?.code || null,
        messageLength: String(error?.message || '').length
    };
}

function sendUnexpectedError(res, context, error, message = 'The request could not be completed.', status = 500) {
    console.error(`[${context}]`, errorDetails(error));
    return res.status(status).json({ error: message });
}

module.exports = { errorDetails, sendUnexpectedError };

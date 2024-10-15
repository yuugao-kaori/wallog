
// ファイルアップロード処理
const fileCreateHandler = (req, res) => {
    upload(req, res, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        return res.status(200).json({
            message: 'File uploaded successfully',
            filePath: req.file.path
        });
    });
};

export default fileCreateHandler;

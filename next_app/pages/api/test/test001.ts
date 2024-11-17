import { NextApiRequest, NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    console.log(`API accessed at: ${new Date().toISOString()}`);
    console.log(`Request method: ${req.method}`);
    
    res.status(200).json({ message: 'success' });
};

export default handler;
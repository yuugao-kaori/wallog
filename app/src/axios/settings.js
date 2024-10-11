
import axios from 'axios';

axios.defaults.baseURL = 'http://192.168.1.148:25000';
axios.defaults.headers.post['Content-Type'] = 'application/json;charset=utf-8';
axios.defaults.headers.post['Access-Control-Allow-Origin'] = '*';
export default axios;
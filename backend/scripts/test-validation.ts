import axios from 'axios';
import FormData from 'form-data';

async function main() {
  const mockStilContent = `STIL 1.0;
Header {
  Title "Test Pattern STIL";
}
PatternBurst "burst1" {
  PatList { "pattern1" }
}
Pattern "pattern1" {
  W "setup";
  V { "inputs"=00; }
  V { "inputs"=11; }
}
`;

  // 1. Test FastAPI directly
  const form1 = new FormData();
  form1.append('file', Buffer.from(mockStilContent), { filename: 'test_dft.stil', contentType: 'application/octet-stream' });
  try {
    const res = await axios.post('http://localhost:8000/validate/upload', form1, {
      headers: form1.getHeaders(),
    });
    console.log('FastAPI response:', JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error('FastAPI error:', err.response?.data || err.message);
  }

  // 2. Test NestJS Integration
  const form2 = new FormData();
  form2.append('file', Buffer.from(mockStilContent), { filename: 'test_dft.stil', contentType: 'application/octet-stream' });
  try {
    const res = await axios.post('http://localhost:3001/api/model-validation/validate', form2, {
      headers: form2.getHeaders(),
    });
    console.log('NestJS response:', JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error('NestJS error:', err.response?.data || err.message);
  }
}

main();

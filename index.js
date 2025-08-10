const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const THAI_POST_TOKEN = 'U*N^HMZ4N-OtXtOiWPBZFoFTIeJJECN=IFQtQ!Q-NUKmRME%HvQpYfCVFiORTeXdQrGUPtEzZLCaWpT=SoIBUoH7SsBbQ!RxUaU&';

app.post('/webhook', async (req, res) => {
  const trackingNumber = req.body.queryResult.parameters.number;

  // ถ้าไม่มีเลขพัสดุ ให้บอทถามก่อน
  if (!trackingNumber) {
    return res.json({
      fulfillmentText: 'กรุณาพิมพ์เลขพัสดุของคุณด้วยค่ะ 📦'
    });
  }

  try {
    // ดึง access token ใหม่ (อายุสั้น)
    const auth = await axios.post(
      'https://trackapi.thailandpost.co.th/post/api/v1/authenticate/token',
      {},
      {
        headers: {
          'Authorization': `Token ${THAI_POST_TOKEN}`
        }
      }
    );

    const accessToken = auth.data.token;

    // เรียก API ตรวจสอบพัสดุ
    const response = await axios.post(
      'https://trackapi.thailandpost.co.th/post/api/v1/track',
      {
        status: 'all',
        language: 'TH',
        barcode: [trackingNumber]
      },
      {
        headers: {
          'Authorization': `Token ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const info = response.data.response.items[trackingNumber];
    let reply = '';

    if (info && info.length > 0) {
      const latest = info[info.length - 1];
      reply = `📦 สถานะล่าสุดของพัสดุ ${trackingNumber}\n- ${latest.status_description}\n📍 ${latest.location}\n🕐 ${latest.status_date}`;
    } else {
      reply = `ไม่พบข้อมูลของหมายเลขพัสดุ ${trackingNumber}`;
    }

    res.json({
      fulfillmentText: reply
    });
  } catch (error) {
    console.error(error.message);
    res.json({
      fulfillmentText: 'เกิดข้อผิดพลาดในการดึงข้อมูลพัสดุ กรุณาลองใหม่ภายหลัง'
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Webhook server is running on port', PORT);
});

// Import các thư viện cần thiết
const express = require('express');
const ZKTeco = require('node-zklib');

// Khởi tạo ứng dụng Express
const app = express();
const port = 3000;

// Cấu hình thông tin máy chấm công
const deviceIP = '192.168.1.240'; // IP của máy chấm công
const devicePort = 8818;          // Port đã xác định từ phần mềm Wise Eye
const timeout = 10000;            // Tăng thời gian chờ lên 10 giây cho ổn định

// =======================================================================
// API 1: LẤY TẤT CẢ DỮ LIỆU CHẤM CÔNG (Giống phiên bản trước)
// =======================================================================
app.get('/api/attendance', async (req, res) => {
    console.log('✅ Nhận được yêu cầu lấy TẤT CẢ dữ liệu chấm công...');
    const zk = new ZKTeco(deviceIP, devicePort, timeout);
    try {
        await zk.createSocket();
        const logs = await zk.getAttendances();
        res.status(200).json({
            success: true,
            message: `Lấy thành công ${logs.data.length} bản ghi chấm công.`,
            data: logs.data
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi xử lý.', error: error.message });
    } finally {
        await zk.disconnect();
    }
});

// =======================================================================
// API 2: LẤY DỮ LIỆU CHẤM CÔNG THEO NGÀY (Chức năng mới)
// =======================================================================
app.get('/api/attendance/by-date', async (req, res) => {
    // Lấy ngày bắt đầu và kết thúc từ query parameters của URL
    const { start, end } = req.query;

    // --- 1. Kiểm tra đầu vào ---
    if (!start || !end) {
        return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ ngày bắt đầu (start) và ngày kết thúc (end) theo định dạng YYYY-MM-DD.' });
    }

    console.log(`✅ Nhận được yêu cầu lấy dữ liệu từ ngày ${start} đến ${end}`);

    // --- 2. Tạo đối tượng Date để so sánh ---
    // Đặt giờ về đầu ngày cho ngày bắt đầu
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);

    // Đặt giờ về cuối ngày cho ngày kết thúc để bao gồm tất cả bản ghi trong ngày
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const zk = new ZKTeco(deviceIP, devicePort, timeout);
    try {
        // --- 3. Kết nối và lấy TẤT CẢ dữ liệu ---
        await zk.createSocket();
        console.log('Đang lấy toàn bộ dữ liệu để lọc...');
        const logs = await zk.getAttendances();
        console.log(`Đã lấy về ${logs.data.length} bản ghi.`);

        // --- 4. Lọc dữ liệu trên server ---
        const filteredLogs = logs.data.filter(log => {
            const recordDate = new Date(log.recordTime);
            // Giữ lại các bản ghi có thời gian nằm trong khoảng yêu cầu
            return recordDate >= startDate && recordDate <= endDate;
        });

        console.log(`Lọc thành công! Tìm thấy ${filteredLogs.length} bản ghi phù hợp.`);

        // --- 5. Trả về kết quả đã lọc ---
        res.status(200).json({
            success: true,
            message: `Tìm thấy ${filteredLogs.length} bản ghi chấm công từ ngày ${start} đến ${end}.`,
            data: filteredLogs
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi xử lý.', error: error.message });
    } finally {
        await zk.disconnect();
    }
});


// Khởi chạy server
app.listen(port, () => {
    console.log(`Backend server đang chạy tại http://localhost:${port}`);
});
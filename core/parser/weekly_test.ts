import { parseWeekly } from "@/parser/weekly.ts";
import { assertEquals } from "@std/assert";

Deno.test("parse weekly schedule with classes and exams", () => {
	const src = `
Tìm kiếm...
Trần Nguyễn Song Nguyên
 Trang chủ   Tin tức249
TRANG CHỦ
THÔNG TIN CHUNG
HỌC TẬP
ĐĂNG KÝ HỌC PHẦN
HỌC PHÍ
Lịch học, lịch thi theo tuầnTất cả Lịch học Lịch thi
23/03/2026

Ca học	Thứ 2
23/03/2026	Thứ 3
24/03/2026	Thứ 4
25/03/2026	Thứ 5
26/03/2026	Thứ 6
27/03/2026	Thứ 7
28/03/2026	Chủ nhật
29/03/2026
Sáng
Tạm ngưngDa và các giác quan - Thực hành
23DYK1C - 012207705203

Tiết: 1 - 2

Phòng: A.703-TH MB Hình thái

GV: Trần Phương Nam

Hệ thần kinh và hành vi - Thực hành
23DYK1C - 012207705003

Tiết: 1 - 6

Phòng: A.704-TH BM Chức năng

GV: Võ Văn Tính

Chiều
Hệ niệu và cân bằng nội mô - Thực hành
23DYK1C - 012207704503

Tiết: 7 - 8

Phòng: B.205

GV: Trương Quốc Hoàng Minh

Ghi chú: Đặt thông tiểu

Tạm ngưngHệ niệu và cân bằng nội mô - Thực hành
23DYK1C - 012207704503

Tiết: 7 - 8

Phòng: Văn phòng BM Nội - BV1A

GV: Hoàng Vân Anh

Ghi chú: Khai thác bệnh sử và tiền sử bệnh lý thận niệu

Da và các giác quan - Thực hành
23DYK1C - 012207705203

Tiết: 7 - 8

Phòng: B.203

GV: Sử Ngọc Kiều Chinh

Ghi chú: Khám tai mũi họng - Đo sức nghe

Tối
Triệu chứng học nội khoa
23DYK1C - 012207706303

Tiết: 13 - 13

Phòng: D.101

Giờ thi: 18h15

Triệu chứng học nội khoa
23DYK1C - 012207706303

Tiết: 13 - 13

Phòng: B.303

Giờ thi: 18h15

Triệu chứng học ngoại khoa
23DYK1C - 012207706503

Tiết: 13 - 13

Phòng: B.301

Giờ thi: 18h15

Lịch học lý thuyết Lịch học thực hành Lịch học trực tuyến Lịch thi Lịch tạm ngưng Lịch lâm sàng
`;

	const timetable = parseWeekly(src);

	assertEquals(timetable.startMondayUTC, new Date(Date.UTC(2026, 2, 23)));
	assertEquals(timetable.rows.length, 8);
	assertEquals(timetable.rows[0].name, "[Tam ngung] Da và các giác quan - Thực hành");
	assertEquals(timetable.rows[0].weekday, 2);
	assertEquals(timetable.rows[2].extras.note, "Đặt thông tiểu");
	assertEquals(timetable.rows[5].name, "Triệu chứng học nội khoa");
	assertEquals(timetable.rows[5].startHm, [18, 15]);
	assertEquals(timetable.rows[5].endHm, [19, 5]);
	assertEquals(timetable.rows[5].extras.status, "thi");
	assertEquals(timetable.rows[5].extras.exam_time, "18:15");
});

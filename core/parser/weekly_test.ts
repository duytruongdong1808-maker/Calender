import { parseWeekly } from "@/parser/weekly.ts";
import { assertEquals } from "@std/assert";

Deno.test("parse weekly grid into correct weekdays", () => {
	const mondayEvening = [
		"Triệu chứng học nội khoa",
		"23DYK1C - 012207706303",
		"",
		"Tiết: 13 - 13",
		"",
		"Phòng: D.101",
		"",
		"Giờ thi: 18h15",
		"",
		"Triệu chứng học nội khoa",
		"23DYK1C - 012207706303",
		"",
		"Tiết: 13 - 13",
		"",
		"Phòng: B.303",
		"",
		"Giờ thi: 18h15",
	].join("\n");

	const src = [
		"Tìm kiếm...",
		"Trần Nguyễn Song Nguyên",
		"TRANG CHỦ",
		"THÔNG TIN CHUNG",
		"HỌC TẬP",
		"ĐĂNG KÝ HỌC PHẦN",
		"HỌC PHÍ",
		"Lịch học, lịch thi theo tuầnTất cả Lịch học Lịch thi",
		"23/03/2026",
		[
			"Ca học",
			"Thứ 2\n23/03/2026",
			"Thứ 3\n24/03/2026",
			"Thứ 4\n25/03/2026",
			"Thứ 5\n26/03/2026",
			"Thứ 6\n27/03/2026",
			"Thứ 7\n28/03/2026",
			"Chủ nhật\n29/03/2026",
		].join("\t"),
		[
			"Sáng",
			"",
			"",
			"",
			"",
			[
				"Tạm ngưngDa và các giác quan - Thực hành",
				"23DYK1C - 012207705203",
				"",
				"Tiết: 1 - 2",
				"",
				"Phòng: A.703-TH MB Hình thái",
				"",
				"GV: Trần Phương Nam",
			].join("\n"),
			[
				"Hệ thần kinh và hành vi - Thực hành",
				"23DYK1C - 012207705003",
				"",
				"Tiết: 1 - 6",
				"",
				"Phòng: A.704-TH BM Chức năng",
				"",
				"GV: Võ Văn Tính",
			].join("\n"),
			"",
		].join("\t"),
		[
			"Chiều",
			[
				"Hệ niệu và cân bằng nội mô - Thực hành",
				"23DYK1C - 012207704503",
				"",
				"Tiết: 7 - 8",
				"",
				"Phòng: B.205",
				"",
				"GV: Trương Quốc Hoàng Minh",
				"",
				"Ghi chú: Đặt thông tiểu",
			].join("\n"),
			"",
			"",
			"",
			[
				"Tạm ngưngHệ niệu và cân bằng nội mô - Thực hành",
				"23DYK1C - 012207704503",
				"",
				"Tiết: 7 - 8",
				"",
				"Phòng: Văn phòng BM Nội - BV1A",
				"",
				"GV: Hoàng Vân Anh",
				"",
				"Ghi chú: Khai thác bệnh sử và tiền sử bệnh lý thận niệu",
			].join("\n"),
			[
				"Da và các giác quan - Thực hành",
				"23DYK1C - 012207705203",
				"",
				"Tiết: 7 - 8",
				"",
				"Phòng: B.203",
				"",
				"GV: Sử Ngọc Kiều Chinh",
				"",
				"Ghi chú: Khám tai mũi họng - Đo sức nghe",
			].join("\n"),
			"",
		].join("\t"),
		[
			"Tối",
			mondayEvening,
			"",
			"",
			[
				"Triệu chứng học ngoại khoa",
				"23DYK1C - 012207706503",
				"",
				"Tiết: 13 - 13",
				"",
				"Phòng: B.301",
				"",
				"Giờ thi: 18h15",
			].join("\n"),
			"",
			"",
			"",
		].join("\t"),
		"Lịch học lý thuyết Lịch học thực hành Lịch học trực tuyến Lịch thi Lịch tạm ngưng Lịch lâm sàng",
	].join("\n");

	const timetable = parseWeekly(src);

	assertEquals(timetable.startMondayUTC, new Date(Date.UTC(2026, 2, 23)));
	assertEquals(timetable.rows.length, 8);
	assertEquals(timetable.rows[0].weekday, 6);
	assertEquals(timetable.rows[1].weekday, 7);
	assertEquals(timetable.rows[2].weekday, 2);
	assertEquals(timetable.rows[3].weekday, 6);
	assertEquals(timetable.rows[4].weekday, 7);
	assertEquals(timetable.rows[5].weekday, 2);
	assertEquals(timetable.rows[6].weekday, 2);
	assertEquals(timetable.rows[7].weekday, 5);
	assertEquals(timetable.rows[5].startHm, [18, 15]);
	assertEquals(timetable.rows[7].extras.status, "thi");
});

010f
R 010f <len>.w {<skill ID>.w <target type>.l <lv>.w <sp>.w <range>.w <skill name>.24B <up>.B}.37B*
	スキル情報の塊。skill nameは一部流れて来ない物がある＞AL_PNEUMA,PR_SLOWPOISON等
	target typeは0-パッシブ、1-敵、2-場所、4-即時発動、16-味方
	lv=0 up=0の場合はリストに出してない?

// ======================================================
// AMS - USERS, TASKS & TOKEN BALANCES
// Demo data only - not a secure production database
// ======================================================

const users = [
    {
        username: "employee1",
        password: "ams123",
        name: "علی رضایی",
        employeeId: "AMS-001",

        sales: 125,
        hours: 168,
        score: 92,

        // موجودی فعلی توکن کاربر
        tokenBalance: 250,

        tasks: [
            {
                id: "ALI-001",
                title: "تکمیل اطلاعات پروفایل",
                description: "اطلاعات پروفایل کاری خود را بررسی و تکمیل کن.",
                reward: 50,
                status: "completed"
            },
            {
                id: "ALI-002",
                title: "بررسی گزارش هفتگی",
                description: "گزارش عملکرد هفتگی خود را بررسی کن.",
                reward: 100,
                status: "in_progress"
            },
            {
                id: "ALI-003",
                title: "تکمیل وظیفه جدید",
                description: "وظیفه تعیین‌شده برای این هفته را انجام بده.",
                reward: 150,
                status: "not_started"
            }
        ]
    },

    {
        username: "employee2",
        password: "ams456",
        name: "سارا احمدی",
        employeeId: "AMS-002",

        sales: 98,
        hours: 154,
        score: 86,

        tokenBalance: 180,

        tasks: [
            {
                id: "SAR-001",
                title: "تکمیل اطلاعات پروفایل",
                description: "اطلاعات پروفایل کاری خود را بررسی و تکمیل کن.",
                reward: 50,
                status: "completed"
            },
            {
                id: "SAR-002",
                title: "بررسی گزارش هفتگی",
                description: "گزارش عملکرد هفتگی خود را بررسی کن.",
                reward: 80,
                status: "not_started"
            },
            {
                id: "SAR-003",
                title: "تکمیل وظیفه جدید",
                description: "وظیفه تعیین‌شده برای این هفته را انجام بده.",
                reward: 120,
                status: "in_progress"
            }
        ]
    },

    {
        username: "employee3",
        password: "ams789",
        name: "محمد کریمی",
        employeeId: "AMS-003",

        sales: 143,
        hours: 176,
        score: 96,

        tokenBalance: 420,

        tasks: [
            {
                id: "MOH-001",
                title: "تکمیل اطلاعات پروفایل",
                description: "اطلاعات پروفایل کاری خود را بررسی و تکمیل کن.",
                reward: 50,
                status: "completed"
            },
            {
                id: "MOH-002",
                title: "بررسی گزارش هفتگی",
                description: "گزارش عملکرد هفتگی خود را بررسی کن.",
                reward: 100,
                status: "completed"
            },
            {
                id: "MOH-003",
                title: "تکمیل وظیفه جدید",
                description: "وظیفه تعیین‌شده برای این هفته را انجام بده.",
                reward: 200,
                status: "in_progress"
            }
        ]
    }
];

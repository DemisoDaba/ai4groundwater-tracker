import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ============================================================
// OFFICIAL PROJECT TEAM
// ============================================================

const TEAM_MEMBERS = [
  {
    member_id: "P1",
    full_name: "Demiso Daba (M.Sc) - PI",
    email: "demisod390@gmail.com",
    role: "admin",
  },
  {
    member_id: "P1*",
    full_name: "Mikiyas Ali",
    email: "mikiasali333@gmail.com",
    role: "team",
  },
  {
    member_id: "P2",
    full_name: "Zelalem Anley (M.Sc)",
    email: "zelalemanley3@gmail.com",
    role: "team",
  },
  {
    member_id: "P3",
    full_name: "Mullusew Bezabih (M.Sc)",
    email: "bmullusew@gmail.com",
    role: "team",
  },
  {
    member_id: "P4",
    full_name: "Sintayehu Yadete (Ph.D.)",
    email: "sintayadete5@gmail.com",
    role: "team",
  },
  {
    member_id: "P5",
    full_name: "Meron Mohammed (M.Sc)",
    email: "meronamin23@gmail.com",
    role: "team",
  },
  {
    member_id: "P6",
    full_name: "Getachew Enssa (M.Sc)",
    email: "getachew.enssa12@gmail.com",
    role: "team",
  },
  {
    member_id: "P7",
    full_name: "Sufiyan Abdurhman (M.Sc)",
    email: "sufi.abdi@gmail.com",
    role: "team",
  },
  {
    member_id: "P8",
    full_name: "Aschalewu Cherie (Ph.D.)",
    email: "aschalewc@gmail.com",
    role: "team",
  },
  {
    member_id: "P9",
    full_name: "Tafese Fitensa (M.Sc)",
    email: "tatiyihun@gmail.com",
    role: "team",
  },
  {
    member_id: "P10",
    full_name: "Kinfe Bereda (M.Sc)",
    email: "kinfem110@gmail.com",
    role: "team",
  },
  {
    member_id: "P11",
    full_name: "Babur Tesfaye (M.Sc)",
    email: "baburtesfaye@gmail.com",
    role: "team",
  },
];

// ============================================================
// POST /api/register
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // --------------------------------------------------------
    // CHECK ENVIRONMENT VARIABLES
    // --------------------------------------------------------

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Supabase environment variables are missing.",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------------
    // READ REQUEST
    // --------------------------------------------------------

    const body = await request.json();

    const member_id = String(
      body.member_id || ""
    ).trim();

    const password = String(
      body.password || ""
    );

    // --------------------------------------------------------
    // VALIDATE PROJECT ID
    // --------------------------------------------------------

    if (!member_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Project ID is required.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // VALIDATE PASSWORD
    // --------------------------------------------------------

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message: "Password is required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // FIND OFFICIAL TEAM MEMBER
    // --------------------------------------------------------

    const member = TEAM_MEMBERS.find(
      (person) =>
        person.member_id === member_id
    );

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid project ID. Please select your assigned project ID.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // CHECK WHETHER EMAIL IS ALREADY REGISTERED
    // ========================================================

    const {
      data: usersData,
      error: usersError,
    } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (usersError) {
      console.error(
        "LIST USERS ERROR:",
        usersError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not check the existing project account.",
        },
        { status: 500 }
      );
    }

    const existingUser =
      usersData.users.find(
        (user) =>
          user.email?.toLowerCase() ===
          member.email.toLowerCase()
      );

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This project account is already registered. Please use Login.",
        },
        { status: 409 }
      );
    }

    // ========================================================
    // CREATE SUPABASE AUTH ACCOUNT
    // ========================================================

    /*
      IMPORTANT:

      The password below comes directly from the user.

      There is NO temporary password.
      There is NO generated password.
      There is NO default password.
    */

    const {
      data: userData,
      error: createUserError,
    } =
      await supabaseAdmin.auth.admin.createUser({
        email: member.email,
        password: password,
        email_confirm: true,

        user_metadata: {
          member_id: member.member_id,
          full_name: member.full_name,
          role: member.role,
        },
      });

    if (createUserError) {
      console.error(
        "CREATE USER ERROR:",
        createUserError
      );

      return NextResponse.json(
        {
          success: false,
          message: createUserError.message,
        },
        { status: 400 }
      );
    }

    if (!userData.user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Account could not be created.",
        },
        { status: 500 }
      );
    }

    const userId = userData.user.id;

    // ========================================================
    // CREATE PROJECT PROFILE
    // ========================================================

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          member_id: member.member_id,
          full_name: member.full_name,
          email: member.email,
          role: member.role,
        })
        .select(
          "id, member_id, full_name, email, role"
        )
        .single();

    // ========================================================
    // IF PROFILE CREATION FAILS
    // ========================================================

    if (profileError || !profile) {
      console.error(
        "PROFILE CREATION ERROR:",
        profileError
      );

      /*
        The Auth account was already created.
        Delete it so registration does not leave
        a broken account behind.
      */

      await supabaseAdmin.auth.admin.deleteUser(
        userId
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Registration could not be completed because the project profile could not be created.",
          error:
            profileError?.message ||
            "Profile creation failed.",
        },
        { status: 500 }
      );
    }

    // ========================================================
    // SUCCESS
    // ========================================================

    return NextResponse.json(
      {
        success: true,
        message:
          "Registration successful. You can now log in using the password you created.",
        user: {
          id: userId,
          member_id: member.member_id,
          full_name: member.full_name,
          email: member.email,
          role: member.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "REGISTRATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong during registration.",
        error:
          error?.message ||
          String(error),
      },
      { status: 500 }
    );
  }
}
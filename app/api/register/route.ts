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

    const project_id = Number(
      body.project_id
    );

    // --------------------------------------------------------
    // VALIDATE MEMBER
    // --------------------------------------------------------

    if (!member_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Member ID is required.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // VALIDATE PROJECT
    // --------------------------------------------------------

    if (
      !Number.isInteger(project_id) ||
      project_id <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A valid project is required.",
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

    // ========================================================
    // FIND MEMBER IN SELECTED PROJECT
    // ========================================================

    const {
      data: directoryMember,
      error: directoryError,
    } = await supabaseAdmin
      .from("project_member_directory")
      .select(
        `
        id,
        project_id,
        member_id,
        full_name,
        email,
        project_role,
        is_project_admin
        `
      )
      .eq("project_id", project_id)
      .eq("member_id", member_id)
      .maybeSingle();

    if (directoryError) {
      console.error(
        "DIRECTORY LOOKUP ERROR:",
        directoryError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Could not verify the project member.",
          error: directoryError.message,
        },
        { status: 500 }
      );
    }

    if (!directoryMember) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This member is not assigned to the selected project.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // VERIFY PROJECT EXISTS
    //
    // IMPORTANT:
    // Database columns are:
    // project_code
    // project_name
    // reference
    // pi_name
    // ========================================================

    const {
      data: project,
      error: projectError,
    } = await supabaseAdmin
      .from("projects")
      .select(
        "id, project_code, project_name, reference, pi_name"
      )
      .eq("id", project_id)
      .maybeSingle();

    if (projectError) {
      console.error(
        "PROJECT LOOKUP ERROR:",
        projectError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to verify the selected project.",
          error: projectError.message,
        },
        { status: 500 }
      );
    }

    if (!project) {
      console.error(
        "PROJECT NOT FOUND:",
        project_id
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Selected project could not be found.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // FIND EXISTING AUTH USER
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
          error: usersError.message,
        },
        { status: 500 }
      );
    }

    const existingUser =
      usersData.users.find(
        (user) =>
          user.email?.toLowerCase() ===
          directoryMember.email.toLowerCase()
      );

    let userId: string;

    // ========================================================
    // CASE 1: AUTH USER ALREADY EXISTS
    // ========================================================

    if (existingUser) {
      userId = existingUser.id;

      console.log(
        "EXISTING AUTH USER FOUND:",
        userId
      );

      // ------------------------------------------------------
      // FIND EXISTING PROFILE
      // ------------------------------------------------------

      const {
        data: existingProfile,
        error: existingProfileError,
      } = await supabaseAdmin
        .from("profiles")
        .select(
          "id, member_id, full_name, email, role"
        )
        .eq("id", userId)
        .maybeSingle();

      if (existingProfileError) {
        console.error(
          "EXISTING PROFILE ERROR:",
          existingProfileError
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Could not verify the existing account profile.",
            error:
              existingProfileError.message,
          },
          { status: 500 }
        );
      }

      // ------------------------------------------------------
      // CREATE PROFILE IF MISSING
      // ------------------------------------------------------

      if (!existingProfile) {
        const {
          error: createProfileError,
        } = await supabaseAdmin
          .from("profiles")
          .insert({
            id: userId,
            member_id:
              directoryMember.member_id,
            full_name:
              directoryMember.full_name,
            email:
              directoryMember.email,
            role:
              directoryMember.is_project_admin
                ? "admin"
                : "team",
          });

        if (createProfileError) {
          console.error(
            "PROFILE CREATION ERROR:",
            createProfileError
          );

          return NextResponse.json(
            {
              success: false,
              message:
                "The existing account was found, but its profile could not be created.",
              error:
                createProfileError.message,
            },
            { status: 500 }
          );
        }
      }
    }

    // ========================================================
    // CASE 2: CREATE NEW AUTH USER
    // ========================================================

    else {
      const {
        data: userData,
        error: createUserError,
      } =
        await supabaseAdmin.auth.admin.createUser({
          email: directoryMember.email,
          password,
          email_confirm: true,

          user_metadata: {
            member_id:
              directoryMember.member_id,

            full_name:
              directoryMember.full_name,

            role:
              directoryMember.is_project_admin
                ? "admin"
                : "team",
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
            message:
              createUserError.message,
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

      userId = userData.user.id;

      console.log(
        "NEW AUTH USER CREATED:",
        userId
      );

      // ------------------------------------------------------
      // CREATE PROFILE
      // ------------------------------------------------------

      const {
        data: profile,
        error: profileError,
      } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          member_id:
            directoryMember.member_id,
          full_name:
            directoryMember.full_name,
          email:
            directoryMember.email,
          role:
            directoryMember.is_project_admin
              ? "admin"
              : "team",
        })
        .select(
          "id, member_id, full_name, email, role"
        )
        .single();

      if (profileError || !profile) {
        console.error(
          "PROFILE CREATION ERROR:",
          profileError
        );

        // Roll back Auth account
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
    }

    // ========================================================
    // LINK USER TO SELECTED PROJECT
    // ========================================================

    const {
      error: projectMemberError,
    } = await supabaseAdmin
      .from("project_members")
      .upsert(
        {
          project_id,
          profile_id: userId,
        },
        {
          onConflict:
            "project_id,profile_id",
        }
      );

    if (projectMemberError) {
      console.error(
        "PROJECT MEMBER LINK ERROR:",
        projectMemberError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "The account was created, but it could not be linked to the selected project.",
          error:
            projectMemberError.message,
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

          member_id:
            directoryMember.member_id,

          full_name:
            directoryMember.full_name,

          email:
            directoryMember.email,

          project_id,

          project_code:
            project.project_code,

          project_name:
            project.project_name,

          project_reference:
            project.reference,

          role:
            directoryMember.is_project_admin
              ? "admin"
              : "team",
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
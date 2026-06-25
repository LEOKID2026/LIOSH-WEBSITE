import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanupStudentDependenciesBeforeDelete,
  deleteParentOwnedStudent,
} from "../../lib/parent-server/delete-parent-owned-student.server.js";

function createMockDb(handlers) {
  return {
    from(table) {
      const handler = handlers[table];
      if (!handler) {
        return {
          delete: () => ({
            eq: async () => ({ error: { code: "42P01", message: "missing" } }),
          }),
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return handler;
    },
  };
}

test("cleanupStudentDependenciesBeforeDelete runs arcade steps in host-room-first order", async () => {
  const order = [];
  const db = createMockDb({
    arcade_results: {
      delete: () => ({
        eq: async () => {
          order.push("arcade_results");
          return { error: null };
        },
      }),
    },
    arcade_quick_match_queue: {
      delete: () => ({
        eq: async () => {
          order.push("arcade_quick_match_queue");
          return { error: null };
        },
      }),
    },
    arcade_rooms: {
      delete: () => ({
        eq: async () => {
          order.push("arcade_rooms");
          return { error: null };
        },
      }),
    },
    arcade_room_players: {
      delete: () => ({
        eq: async () => {
          order.push("arcade_room_players");
          return { error: null };
        },
      }),
    },
    classroom_activity_attempts: {
      delete: () => ({
        eq: async () => {
          order.push("classroom_activity_attempts");
          return { error: null };
        },
      }),
    },
    classroom_activity_student_status: {
      delete: () => ({
        eq: async () => {
          order.push("classroom_activity_student_status");
          return { error: null };
        },
      }),
    },
  });

  const failure = await cleanupStudentDependenciesBeforeDelete(db, "00000000-0000-4000-8000-000000000001");
  assert.equal(failure, null);
  assert.deepEqual(order, [
    "arcade_results",
    "arcade_quick_match_queue",
    "arcade_rooms",
    "arcade_room_players",
    "arcade_results",
    "classroom_activity_attempts",
    "classroom_activity_student_status",
  ]);
});

test("deleteParentOwnedStudent returns dependency error when arcade cleanup fails", async () => {
  const studentId = "00000000-0000-4000-8000-000000000002";
  const parentUserId = "00000000-0000-4000-8000-000000000003";

  const db = {
    from(table) {
      if (table === "students") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: studentId, full_name: "בדיקה" },
                  error: null,
                }),
              }),
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        };
      }
      if (table === "arcade_rooms") {
        return {
          delete: () => ({
            eq: async () => ({
              error: {
                code: "23503",
                message: 'violates foreign key constraint "arcade_rooms_host_student_id_fkey"',
              },
            }),
          }),
        };
      }
      return {
        delete: () => ({
          eq: async () => ({ error: null }),
        }),
      };
    },
  };

  const result = await deleteParentOwnedStudent(db, parentUserId, studentId);
  assert.equal(result.ok, false);
  assert.equal(result.code, "delete_student_dependency_failed");
  assert.match(result.error, /arcade_rooms/);
});

test("deleteParentOwnedStudent rejects non-owned student", async () => {
  const db = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    }),
  };

  const result = await deleteParentOwnedStudent(
    db,
    "00000000-0000-4000-8000-000000000004",
    "00000000-0000-4000-8000-000000000005"
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, "student_not_owned");
});

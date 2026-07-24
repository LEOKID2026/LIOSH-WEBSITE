import {
  ACTION_DECISION_CONTRACT_VERSION,
  validateActionDecisionContractV2,
} from "./action-decision-contract-v2.js";
import { curriculumSkillEntity } from "../curriculum-skill-entity-registry.js";

function safeTarget(target) {
  const detail = target?.prerequisiteDetail;
  const prerequisiteEntity =
    detail?.precision === "exact_skill"
      ? curriculumSkillEntity(target?.prerequisite)
      : null;
  return {
    subject: String(target?.subject || ""),
    topic: String(target?.topic || ""),
    subskill: target?.subskill ? String(target.subskill) : null,
    subskillId: target?.subskillId ? String(target.subskillId) : null,
    prerequisite: target?.prerequisite ? String(target.prerequisite) : null,
    prerequisiteTopic: prerequisiteEntity?.topicKey || null,
    prerequisiteDetail: detail
      ? {
          precision: detail.precision ? String(detail.precision) : null,
          entityType: detail.entityType ? String(detail.entityType) : null,
        }
      : null,
  };
}

export function projectActionDecisionContractV2ForApi(contract) {
  const validation = validateActionDecisionContractV2(contract);
  if (!validation.ok) return null;
  return {
    contractVersion: ACTION_DECISION_CONTRACT_VERSION,
    action: contract.action,
    family: contract.family,
    intensity: contract.intensity,
    eligible: contract.eligible === true,
    intervention: contract.intervention === true,
    target: safeTarget(contract.target),
    deliveryMode: contract.deliveryMode,
    evidenceBasis: Array.isArray(contract.evidenceBasis)
      ? contract.evidenceBasis.map((entry) => ({
          source: String(entry?.source || ""),
          codes: Array.isArray(entry?.codes) ? entry.codes.map(String) : [],
        }))
      : [],
    reasonCodes: Array.isArray(contract.reasonCodes)
      ? contract.reasonCodes.map(String)
      : [],
    authorityTrace: {
      soleAuthority: "canonicalState",
      actionState: String(contract.authorityTrace?.actionState || ""),
      intensityCap: String(contract.authorityTrace?.intensityCap || "RI0"),
      interventionAuthorized:
        contract.authorityTrace?.interventionAuthorized === true,
      calibrationContractVersion:
        contract.authorityTrace?.calibrationContractVersion || null,
    },
    createdAt: contract.createdAt,
    expiry: contract.expiry ? { ...contract.expiry } : null,
    reevaluation: contract.reevaluation
      ? {
          condition: String(contract.reevaluation.condition || ""),
          afterActivities: Number(contract.reevaluation.afterActivities) || 0,
          onNewIndependentEvidence:
            contract.reevaluation.onNewIndependentEvidence === true,
          transitionWhen: Array.isArray(contract.reevaluation.transitionWhen)
            ? contract.reevaluation.transitionWhen.map(String)
            : [],
        }
      : null,
    previousAction: contract.previousAction || null,
    rollbackBehavior: contract.rollbackBehavior || null,
  };
}

export function collectActionDecisionContractsV2(payload) {
  const found = new Map();
  const visited = new Set();
  function walk(value) {
    if (!value || typeof value !== "object" || visited.has(value)) return;
    visited.add(value);
    if (value.actionDecisionContract?.version === ACTION_DECISION_CONTRACT_VERSION) {
      const projected = projectActionDecisionContractV2ForApi(
        value.actionDecisionContract,
      );
      if (projected) {
        const key = `${projected.target.subject}\u0001${projected.target.topic}`;
        const existing = found.get(key);
        if (!existing || (!existing.eligible && projected.eligible)) {
          found.set(key, projected);
        }
      }
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    Object.values(value).forEach(walk);
  }
  walk(payload);
  return [...found.values()].sort((a, b) =>
    `${a.target.subject}:${a.target.topic}`.localeCompare(
      `${b.target.subject}:${b.target.topic}`,
    ),
  );
}

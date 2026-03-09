"""Weighted K-Means clustering for standardized feature spaces."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any, final

import numpy as np
from numpy.random import Generator

Array = Any


@dataclass(slots=True)
class _FitResult:
    centers: Array
    labels: Array
    inertia: float
    n_iter: int


@final
class WeightedKMeans:
    """K-Means with weighted Euclidean distance on standardized features."""

    n_clusters: int
    weights: Sequence[float] | None
    max_iter: int
    tol: float
    random_state: int | None
    n_init: int

    weights_: Array | None
    n_features_in_: int | None
    cluster_centers_: Array | None
    labels_: Array | None
    inertia_: float | None
    n_iter_: int | None

    def __init__(
        self,
        n_clusters: int,
        weights: Sequence[float] | None = None,
        max_iter: int = 300,
        tol: float = 1e-4,
        random_state: int | None = 42,
        n_init: int = 10,
    ) -> None:
        self.n_clusters = int(n_clusters)
        self.weights = weights
        self.max_iter = int(max_iter)
        self.tol = float(tol)
        self.random_state = random_state
        self.n_init = int(n_init)

        self.weights_ = None
        self.n_features_in_ = None
        self.cluster_centers_ = None
        self.labels_ = None
        self.inertia_ = None
        self.n_iter_ = None

    def fit(self, X: Sequence[Sequence[float]] | Array) -> WeightedKMeans:
        """Fit weighted K-Means on a 2D feature matrix."""
        X_arr = self._validate_X(X)
        n_samples = int(X_arr.shape[0])
        n_features = int(X_arr.shape[1])
        self._validate_hyperparameters(n_samples)

        self.weights_ = self._resolve_weights(n_features)
        self.n_features_in_ = n_features

        master_rng = np.random.default_rng(self.random_state)
        best_result: _FitResult | None = None

        for _ in range(self.n_init):
            seed = int(master_rng.integers(0, np.iinfo(np.int32).max, endpoint=False))
            run_result = self._run_single_fit(X_arr, np.random.default_rng(seed))
            if best_result is None or run_result.inertia < best_result.inertia:
                best_result = run_result

        if best_result is None:
            raise RuntimeError("WeightedKMeans fit failed to produce a result.")

        self.cluster_centers_ = best_result.centers
        self.labels_ = best_result.labels
        self.inertia_ = float(best_result.inertia)
        self.n_iter_ = best_result.n_iter
        return self

    def predict(self, X: Sequence[Sequence[float]] | Array) -> Array:
        """Assign each sample in X to the nearest fitted cluster center."""
        if self.cluster_centers_ is None or self.n_features_in_ is None or self.weights_ is None:
            raise ValueError("This WeightedKMeans instance is not fitted yet. Call fit(X) first.")

        X_arr = self._validate_X(X)
        if int(X_arr.shape[1]) != self.n_features_in_:
            raise ValueError(f"Expected {self.n_features_in_} features, got {X_arr.shape[1]}.")

        distances_sq = self._weighted_distance_matrix(X_arr, self.cluster_centers_, squared=True)
        return np.argmin(distances_sq, axis=1).astype(np.int64)

    def _weighted_distance_matrix(
        self,
        X: Array,
        centers: Array,
        *,
        squared: bool = True,
    ) -> Array:
        """Return pairwise weighted Euclidean distances to cluster centers."""
        if self.weights_ is None:
            raise ValueError("weights_ is not initialized. Call fit(X) first.")

        diff = X[:, np.newaxis, :] - centers[np.newaxis, :, :]
        distances_sq = np.sum(self.weights_[np.newaxis, np.newaxis, :] * diff * diff, axis=2)
        clipped = np.maximum(distances_sq, 0.0)
        if squared:
            return clipped
        return np.sqrt(clipped)

    def _run_single_fit(self, X: Array, rng: Generator) -> _FitResult:
        centers = self._init_centroids_kmeans_pp(X, rng)
        n_samples = int(X.shape[0])

        labels = np.zeros(n_samples, dtype=np.int64)
        n_iter = 0

        for i in range(self.max_iter):
            n_iter = i + 1
            distances_sq = self._weighted_distance_matrix(X, centers, squared=True)
            labels = np.argmin(distances_sq, axis=1).astype(np.int64)

            new_centers = centers.copy()
            empty_clusters: list[int] = []

            for cluster_idx in range(self.n_clusters):
                members = X[labels == cluster_idx]
                if int(members.shape[0]) == 0:
                    empty_clusters.append(cluster_idx)
                    continue
                new_centers[cluster_idx] = np.mean(members, axis=0)

            if empty_clusters:
                self._recover_empty_clusters(
                    X=X,
                    labels=labels,
                    distances_sq=distances_sq,
                    centers=new_centers,
                    empty_clusters=empty_clusters,
                )

            shift_per_center = np.linalg.norm(new_centers - centers, axis=1)
            center_shift = float(np.max(shift_per_center))
            centers = new_centers
            if center_shift <= self.tol:
                break

        final_distances_sq = self._weighted_distance_matrix(X, centers, squared=True)
        final_labels = np.argmin(final_distances_sq, axis=1).astype(np.int64)
        sample_indices = np.arange(n_samples, dtype=np.int64)
        final_inertia = float(np.sum(final_distances_sq[sample_indices, final_labels]))

        return _FitResult(
            centers=centers,
            labels=final_labels,
            inertia=final_inertia,
            n_iter=n_iter,
        )

    def _recover_empty_clusters(
        self,
        X: Array,
        labels: Array,
        distances_sq: Array,
        centers: Array,
        empty_clusters: list[int],
    ) -> None:
        assigned_distances = distances_sq[np.arange(X.shape[0], dtype=np.int64), labels]
        candidate_order = np.argsort(assigned_distances)[::-1].astype(np.int64)
        used_indices: set[int] = set()

        for cluster_idx in empty_clusters:
            chosen_idx: int | None = None
            for sample_idx in candidate_order:
                candidate = int(sample_idx)
                if candidate not in used_indices:
                    chosen_idx = candidate
                    break

            if chosen_idx is None:
                chosen_idx = int(candidate_order[0])

            centers[cluster_idx] = X[chosen_idx]
            used_indices.add(chosen_idx)

    def _init_centroids_kmeans_pp(self, X: Array, rng: Generator) -> Array:
        n_samples = int(X.shape[0])
        n_features = int(X.shape[1])
        centers = np.empty((self.n_clusters, n_features), dtype=np.float64)

        first_idx = int(rng.integers(0, n_samples, endpoint=False))
        centers[0] = X[first_idx]
        chosen: set[int] = {first_idx}

        min_distances_sq = self._weighted_distance_matrix(X, centers[:1], squared=True)[:, 0]

        for i in range(1, self.n_clusters):
            total = float(np.sum(min_distances_sq))

            if not np.isfinite(total) or total <= 0.0:
                remaining = [idx for idx in range(n_samples) if idx not in chosen]
                if not remaining:
                    next_idx = int(rng.integers(0, n_samples, endpoint=False))
                else:
                    remaining_arr = np.asarray(remaining, dtype=np.int64)
                    next_idx = int(rng.choice(remaining_arr))
            else:
                probs = min_distances_sq / total
                next_idx = int(rng.choice(n_samples, p=probs))

            centers[i] = X[next_idx]
            chosen.add(next_idx)

            distances_to_new_center = self._weighted_distance_matrix(
                X,
                centers[i : i + 1],
                squared=True,
            )[:, 0]
            min_distances_sq = np.minimum(min_distances_sq, distances_to_new_center)

        return centers

    @staticmethod
    def _validate_X(X: Sequence[Sequence[float]] | Array) -> Array:
        X_arr = np.asarray(X, dtype=np.float64)
        if X_arr.ndim != 2:
            raise ValueError("X must be a 2D array-like structure.")
        if int(X_arr.shape[0]) == 0:
            raise ValueError("X must contain at least one sample.")
        if int(X_arr.shape[1]) == 0:
            raise ValueError("X must contain at least one feature.")
        if not np.all(np.isfinite(X_arr)):
            raise ValueError("X contains NaN or infinite values.")
        return X_arr

    def _validate_hyperparameters(self, n_samples: int) -> None:
        if self.n_clusters <= 0:
            raise ValueError("n_clusters must be a positive integer.")
        if self.n_clusters > n_samples:
            raise ValueError("n_clusters cannot exceed the number of samples.")
        if self.max_iter <= 0:
            raise ValueError("max_iter must be a positive integer.")
        if self.tol < 0:
            raise ValueError("tol must be non-negative.")
        if self.n_init <= 0:
            raise ValueError("n_init must be a positive integer.")

    def _resolve_weights(self, n_features: int) -> Array:
        if self.weights is None:
            weights = np.ones(n_features, dtype=np.float64)
        else:
            weights = np.asarray(self.weights, dtype=np.float64)
            if weights.ndim != 1:
                raise ValueError("weights must be a 1D array-like sequence.")
            if int(weights.shape[0]) != n_features:
                raise ValueError(
                    f"weights length ({weights.shape[0]}) must match n_features ({n_features})."
                )

        if not np.all(np.isfinite(weights)):
            raise ValueError("weights contains NaN or infinite values.")
        if np.any(weights < 0):
            raise ValueError("weights must be non-negative.")
        if not np.any(weights > 0):
            raise ValueError("At least one weight must be strictly positive.")

        return weights


__all__ = ["WeightedKMeans"]

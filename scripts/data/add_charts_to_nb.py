import json

notebook_path = r"c:\Users\ADRIAN\Github\skufu\DianaV2\Ian_ML\training\ipnyb\Ian_KMeans_Clustering.ipynb"

with open(notebook_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

# Cell for Radar Chart
radar_markdown = {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "## 7. The Disease \"Fingerprint\" (Radar Chart)\n",
    "\n",
    "A Radar Chart (or Spider Plot) is a great way to see the unique \"shape\" of each disease subtype. \n",
    "\n",
    "We calculate the average standardized value for each lab test. \n",
    "* If the shape spikes toward **BMI**, that subtype is driven by Obesity (MOD).\n",
    "* If the shape spikes toward **LDL/Triglycerides**, that subtype is driven by toxic fats in the blood (SIDD or SIRD)."
   ]
}

radar_code = {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "import math\n",
    "\n",
    "# Calculate the mean Z-scores for each cluster to plot the radar chart\n",
    "cluster_means = df_clean.groupby('Phenotype')[CLUSTER_FEATURES].mean()\n",
    "scaler_means = pd.DataFrame(scaler.transform(cluster_means), columns=CLUSTER_FEATURES, index=cluster_means.index)\n",
    "\n",
    "# Setup the radar chart\n",
    "categories = CLUSTER_FEATURES\n",
    "N = len(categories)\n",
    "angles = [n / float(N) * 2 * math.pi for n in range(N)]\n",
    "angles += angles[:1]  # Complete the circle\n",
    "\n",
    "fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))\n",
    "\n",
    "for phenotype in ['SIRD', 'SIDD', 'MOD', 'MARD']:\n",
    "    if phenotype not in scaler_means.index: continue\n",
    "    values = scaler_means.loc[phenotype].values.flatten().tolist()\n",
    "    values += values[:1]\n",
    "    ax.plot(angles, values, linewidth=2, linestyle='solid', label=phenotype, c=colors.get(phenotype, '#333'))\n",
    "    ax.fill(angles, values, alpha=0.1, c=colors.get(phenotype, '#333'))\n",
    "\n",
    "plt.xticks(angles[:-1], categories)\n",
    "ax.set_rlabel_position(0)\n",
    "plt.title('Biological Fingerprints of the 4 Diabetes Subtypes', size=15, y=1.1)\n",
    "plt.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1))\n",
    "plt.show()"
   ]
}

# Cell for Boxplots
boxplot_markdown = {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "## 8. Deep Dive: Lab Tests by Subtype (Boxplots)\n",
    "\n",
    "Let's look at the actual distribution of the real-world lab tests (not standardized math numbers) across the 4 subtypes. \n",
    "\n",
    "Notice how **MOD** dominates the BMI chart, while **SIDD/SIRD** dominate the cholesterol charts."
   ]
}

boxplot_code = {
   "cell_type": "code",
   "execution_count": None,
   "metadata": {},
   "outputs": [],
   "source": [
    "features_to_plot = ['age', 'bmi', 'ldl', 'triglycerides']\n",
    "fig, axes = plt.subplots(2, 2, figsize=(14, 10))\n",
    "axes = axes.flatten()\n",
    "\n",
    "for i, feature in enumerate(features_to_plot):\n",
    "    sns.boxplot(x='Phenotype', y=feature, data=df_clean, \n",
    "                order=['SIRD', 'SIDD', 'MOD', 'MARD'], \n",
    "                palette=colors, ax=axes[i])\n",
    "    axes[i].set_title(f'Distribution of {feature.upper()}')\n",
    "    axes[i].set_ylabel(feature.upper())\n",
    "    axes[i].set_xlabel('')\n",
    "\n",
    "plt.tight_layout()\n",
    "plt.show()"
   ]
}

nb["cells"].extend([radar_markdown, radar_code, boxplot_markdown, boxplot_code])

with open(notebook_path, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1)

print("Charts successfully appended to the notebook.")

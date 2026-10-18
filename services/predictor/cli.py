"""
Command Line Interface (CLI) for FYND Predict
FYND Predict - AI Demand Intelligence
"""

import os
import sys
import argparse
import json

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from services.predictor.engine import ForecastingEngine


def cmd_validate(args):
    """Validates a dataset file and prints data-quality report."""
    engine = ForecastingEngine()
    print(f"Validating dataset: {args.file}")
    report = engine.validate_dataset(args.file)
    print("\n--- VALIDATION REPORT ---")
    print(f"Valid: {report['valid']}")
    print(f"Quality Score: {report['quality_score']} / 100")
    print(f"Total Rows: {report['total_rows']}, Valid Rows: {report['valid_rows']}")
    if report['date_range']:
        print(f"Date Coverage: {report['date_range']['start']} to {report['date_range']['end']} ({report['date_range']['span_days']} days)")
    print(f"Distinct Stores: {len(report['distinct_locations'])} {report['distinct_locations']}")
    print(f"Distinct Products: {len(report['distinct_products'])} {report['distinct_products']}")
    if report['warnings']:
        print("\nWarnings:")
        for w in report['warnings']:
            print(f"  • {w}")
    if report['anomalies']:
        print("\nAnomalies:")
        for a in report['anomalies']:
            print(f"  [!] {a['type']}: {a['message']}")


def cmd_train(args):
    """Runs end-to-end chronological training and model benchmarking."""
    engine = ForecastingEngine()
    print(f"Starting chronological training on {args.file} (Holdout: {args.holdout_days} days)...")
    result = engine.run_training_pipeline(args.file, holdout_days=args.holdout_days)

    if result.get('status') == 'failed':
        print(f"\n[ERROR] Training Failed: {result.get('error')}")
        sys.exit(1)

    print("\n=== TRAINING & BENCHMARKING COMPLETE ===")
    print(f"Run ID: {result['run_id']}")
    print(f"Model ID: {result['model_id']}")
    print(f"Selected Model: {result['selected_model']}")
    print(f"Reason: {result['selection_reason']}")

    print("\n--- MODEL COMPARISON BENCHMARK ---")
    for m in result['model_comparison']:
        sel_tag = " [WINNER]" if m['is_selected'] else ""
        print(f"• {m['model_name']:<35} | MAE: {m['mae']:>5.2f} | WAPE: {m['wape_pct']:>5.2f}% | RMSE: {m['rmse']:>5.2f} {sel_tag}")

    print("\n--- SUMMARY KPIS ---")
    for k, v in result['summary_kpis'].items():
        print(f"  {k}: {v}")

    print("\n--- TOP FORECASTED PRODUCTS (7-DAY DEMAND) ---")
    for p in result['insights']['ranked_products'][:5]:
        print(f"  {p['product_name']:<22} ({p['product_id']}) -> {p['forecast_units_7d']:>5.1f} units [Bounds: {p['lower_bound_7d']} - {p['upper_bound_7d']}]")

    print("\n--- EXPLAINABLE DEMAND RECOMMENDATIONS ---")
    for r in result['insights']['recommendations']:
        print(f"  [{r['category']}] {r['title']}")
        print(f"    Evidence: {r['evidence']}")
        print(f"    Action:   {r['explanation']}\n")

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as out_f:
            json.dump(result, out_f, indent=2)
        print(f"Full results exported to {args.output}")


def main():
    parser = argparse.ArgumentParser(description="FYND Predict - AI Demand Intelligence CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Validate command
    val_parser = subparsers.add_parser("validate", help="Validate dataset and print data-quality profiling report")
    val_parser.add_argument("--file", "-f", required=True, help="Path to CSV or Excel dataset")

    # Train command
    train_parser = subparsers.add_parser("train", help="Run chronological model training, evaluation, and forecast generation")
    train_parser.add_argument("--file", "-f", default="data/C30_Dataset_CSVs/Product_Daily_History.csv", help="Path to training dataset")
    train_parser.add_argument("--holdout-days", "-d", type=int, default=14, help="Number of final days for chronological holdout (default: 14)")
    train_parser.add_argument("--output", "-o", help="Optional path to export full JSON results")

    args = parser.parse_args()
    if args.command == "validate":
        cmd_validate(args)
    elif args.command == "train":
        cmd_train(args)


if __name__ == "__main__":
    main()
